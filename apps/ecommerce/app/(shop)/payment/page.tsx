import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { createCheckoutSession } from '@nts/integrations';
import { createOrderDraft } from '@/src/lib/orders';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { CheckoutPriceDetails } from '@/components/checkout-price-details';

async function processCOD(formData: FormData) {
  'use server';
  // Require authentication
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/payment');
  }
  
  const addressId = String(formData.get('addressId') || '');
  const supabase = getSupabaseServerClient();
  
  // Load address
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

  // Prepare order items from cart
  const orderItems = (cart ?? [])
    .map((row: any) => {
      const priceCents = Number(row?.products?.sale_price_cents ?? row?.products?.price_cents ?? 0);
      if (priceCents > 0 && row.product_id) {
        return {
          product_id: row.product_id,
          name: row.products?.name || 'Unknown Product',
          unit_amount_cents: priceCents,
          quantity: Number(row.quantity) || 1,
          attributes: {}
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Create order with COD payment method
  const orderId = await createOrderDraft({
    customerId: authPayload.userId,
    totalCents: total,
    shippingAddress,
    items: orderItems,
    metadata: { source: 'ecommerce', payment_method: 'COD' }
  });

  // Update order to mark as COD (unpaid, but confirmed)
  const supabaseAdmin = getSupabaseAdminClient();
  await supabaseAdmin
    .from('orders')
    .update({ 
      payment_status: 'unpaid',
      status: 'pending',
      paid_amount_cents: 0, // COD - no payment received yet
      paid_amount: 0,
      metadata: { payment_method: 'COD', source: 'ecommerce' }
    })
    .eq('id', orderId);

  // Clear cart for COD orders
  await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('customer_id', authPayload.userId);

  redirect('/checkout/success');
}

async function processUPI(formData: FormData) {
  'use server';
  // For now, UPI is similar to COD - create order and mark as unpaid
  // In the future, you can integrate with UPI payment gateway
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/payment');
  }
  
  const addressId = String(formData.get('addressId') || '');
  const supabase = getSupabaseServerClient();
  
  // Load address
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

  // Prepare order items from cart
  const orderItems = (cart ?? [])
    .map((row: any) => {
      const priceCents = Number(row?.products?.sale_price_cents ?? row?.products?.price_cents ?? 0);
      if (priceCents > 0 && row.product_id) {
        return {
          product_id: row.product_id,
          name: row.products?.name || 'Unknown Product',
          unit_amount_cents: priceCents,
          quantity: Number(row.quantity) || 1,
          attributes: {}
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Create order with UPI payment method
  const orderId = await createOrderDraft({
    customerId: authPayload.userId,
    totalCents: total,
    shippingAddress,
    items: orderItems,
    metadata: { source: 'ecommerce', payment_method: 'UPI' }
  });

  // Update order to mark as UPI (unpaid, but confirmed)
  // TODO: Integrate with UPI payment gateway
  const supabaseAdmin = getSupabaseAdminClient();
  await supabaseAdmin
    .from('orders')
    .update({ 
      payment_status: 'unpaid',
      status: 'pending',
      paid_amount_cents: 0, // UPI - no payment received yet (will be updated when payment gateway confirms)
      paid_amount: 0,
      metadata: { payment_method: 'UPI', source: 'ecommerce' }
    })
    .eq('id', orderId);

  // Clear cart for UPI orders
  await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('customer_id', authPayload.userId);

  redirect('/checkout/success');
}

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

  // Prepare order items from cart
  const orderItems = (cart ?? [])
    .map((row: any) => {
      const priceCents = Number(row?.products?.sale_price_cents ?? row?.products?.price_cents ?? 0);
      if (priceCents > 0 && row.product_id) {
        return {
          product_id: row.product_id,
          name: row.products?.name || 'Unknown Product',
          unit_amount_cents: priceCents,
          quantity: Number(row.quantity) || 1,
          attributes: {}
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const orderId = await createOrderDraft({
    customerId: authPayload.userId,
    totalCents: total,
    shippingAddress,
    items: orderItems,
    metadata: { source: 'ecommerce' }
  });
  
  // Fetch customer data for Stripe (required for Indian exports)
  const { data: customer } = await supabase
    .from('customers')
    .select('name, email, phone')
    .eq('id', authPayload.userId)
    .single();
  
  // Get base URL for Stripe redirects
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : `http://localhost:${process.env.PORT ?? '3000'}`);

  const session = await createCheckoutSession({
    items,
    successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/cart`,
    customerEmail: customer?.email || undefined,
    customerName: customer?.name || shippingAddress.name || undefined,
    shippingAddress: shippingAddress,
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
          <h2 className="text-lg font-semibold">Select Payment Method</h2>
          <p className="mt-1 text-sm text-neutral-400">Choose your preferred payment method to complete the order.</p>
          
          <div className="mt-6 space-y-3">
            {/* COD Option */}
            <form action={processCOD} className="border border-neutral-700 rounded-lg p-4 hover:border-primary transition-colors">
              <input type="hidden" name="addressId" defaultValue={ctx.selectedId} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-neutral-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary hidden" id="cod-indicator"></div>
                  </div>
                  <div>
                    <div className="font-medium">Cash on Delivery (COD)</div>
                    <div className="text-sm text-neutral-400">Pay when you receive the order</div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Place Order
                </button>
              </div>
            </form>

            {/* Card/Stripe Option */}
            <form action={startPayment} className="border border-neutral-700 rounded-lg p-4 hover:border-primary transition-colors">
              <input type="hidden" name="addressId" defaultValue={ctx.selectedId} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-neutral-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary hidden" id="card-indicator"></div>
                  </div>
                  <div>
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-sm text-neutral-400">Pay securely with Stripe</div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Pay Now
                </button>
              </div>
            </form>

            {/* UPI Option */}
            <form action={processUPI} className="border border-neutral-700 rounded-lg p-4 hover:border-primary transition-colors">
              <input type="hidden" name="addressId" defaultValue={ctx.selectedId} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-neutral-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary hidden" id="upi-indicator"></div>
                  </div>
                  <div>
                    <div className="font-medium">UPI</div>
                    <div className="text-sm text-neutral-400">Pay with UPI apps (PhonePe, GPay, etc.)</div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Pay Now
                </button>
              </div>
            </form>
          </div>
        </div>

        <CheckoutPriceDetails mrp={ctx.mrp} discount={ctx.discount} platformFee={ctx.platformFee} total={ctx.total} />
      </div>
    </div>
  );
}


