import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { createCheckoutSession } from '@nts/integrations';
import { createOrderDraft } from '@/src/lib/orders';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { CheckoutPriceDetails } from '@/components/checkout-price-details';

async function startPayment(formData: FormData) {
  'use server';
  // Require authentication
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/payment');
  }
  
  const addressId = String(formData.get('addressId') || '');
  const supabase = getSupabaseServerClient();

  // Load address (by id if provided; else pick default/first)
  let addr: any = null;
  if (addressId) {
    const { data } = await supabase.from('addresses').select('*').match({ id: addressId, customer_id: authPayload.userId }).maybeSingle();
    addr = data;
  }
  if (!addr) {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('customer_id', authPayload.userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    addr = data;
  }
  if (!addr) {
    redirect('/checkout');
  }

  // Build line items from cart
  const { data: cart } = await supabase
    .from('cart_items')
    .select('product_id, quantity, products ( name, price_cents, sale_price_cents )')
    .eq('customer_id', authPayload.userId);
  const items = (cart ?? [])
    .map((row: any) => {
      const priceCents = Number(row?.products?.sale_price_cents ?? row?.products?.price_cents ?? 0);
      return priceCents > 0
        ? { id: row.product_id as string, name: row.products?.name as string, amount: priceCents, currency: 'inr', quantity: Number(row.quantity) || 1 }
        : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; amount: number; currency: string; quantity: number }>;
  const total = items.reduce((sum, it) => sum + it.amount * it.quantity, 0);
  if (items.length === 0 || total <= 0) {
    redirect('/cart');
  }

  const shippingAddress = {
    name: addr.name,
    phone: addr.phone,
    pincode: addr.postal_code,
    address1: addr.line1,
    address2: addr.line2,
    area: addr.area,
    district: addr.city,
    state: addr.state,
    country: addr.country === 'IN' ? 'India' : addr.country,
    landmark: addr.landmark,
    addressType: addr.address_type ?? addr.label ?? 'HOME'
  };

  const orderId = await createOrderDraft({
    customerId: authPayload.userId,
    totalCents: total,
    shippingAddress,
    metadata: { source: 'ecommerce' }
  });
  const session = await createCheckoutSession({
    items,
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    metadata: { orderId }
  });
  if (session.url) {
    redirect(session.url as any);
  }
  redirect('/cart');
}

async function fetchContext(searchParams: Promise<{ addressId?: string }>) {
  const { addressId } = await searchParams;
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/payment');
  }
  
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const authHeaders = { Authorization: `Bearer ${token}` };
  const [addrRes, cartRes] = await Promise.all([
    fetch(`${base}/api/public/addresses`, { cache: 'no-store', headers: authHeaders }),
    fetch(`${base}/api/public/cart`, { cache: 'no-store', headers: authHeaders })
  ]);
  const addrJson = addrRes.ok ? await addrRes.json() : { data: [] };
  const cartJson = cartRes.ok ? await cartRes.json() : { data: [] };
  const addresses: any[] = Array.isArray(addrJson?.data) ? addrJson.data : [];
  const cartItems: any[] = Array.isArray(cartJson?.data) ? cartJson.data : [];
  const mrp = cartItems.reduce((s, it) => s + (Number(it.originalPrice) || Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const total = cartItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const discount = Math.max(0, mrp - total);
  const platformFee = cartItems.length > 0 ? 23 : 0;
  const selectedId = addressId || (addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? '');
  return { addresses, cartItems, mrp, total, discount, platformFee, selectedId };
}

export default async function PaymentPage(props: { searchParams: Promise<{ addressId?: string }> }) {
  const ctx = await fetchContext(props.searchParams);
  if (!ctx.addresses.length) {
    redirect('/checkout');
  }
  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm tracking-wider sm:tracking-widest text-neutral-400 overflow-x-auto">
        <span className="font-medium text-neutral-300 whitespace-nowrap">BAG</span>
        <span className="hidden sm:inline">──────</span>
        <span className="font-medium text-neutral-300 whitespace-nowrap">ADDRESS</span>
        <span className="hidden sm:inline">──────</span>
        <span className="font-semibold text-white whitespace-nowrap">PAYMENT</span>
      </div>

      <div className="mt-6 sm:mt-8 grid gap-6 sm:gap-8 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Confirm & Pay</h2>
          <p className="mt-1 text-sm text-neutral-400">We will ship to your selected address. You can go back to change it.</p>
          <form action={startPayment} className="mt-6 space-y-4">
            <input type="hidden" name="addressId" defaultValue={ctx.selectedId} />
            <button className="h-10 w-full sm:w-auto px-6 rounded-md bg-primary text-primary-foreground">Pay with Stripe</button>
          </form>
        </div>

        <CheckoutPriceDetails mrp={ctx.mrp} discount={ctx.discount} platformFee={ctx.platformFee} total={ctx.total} />
      </div>
    </div>
  );
}


