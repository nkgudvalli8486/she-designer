import { createCheckoutSession } from '@nts/integrations';
import { redirect } from 'next/navigation';
import { createOrderDraft } from '@/src/lib/orders';
import { AddressForm } from '@/components/checkout/address-form';
import { AddressList, type SavedAddress } from '@/components/checkout/address-list';
import { AddressSectionWithModal } from '@/components/checkout/address-section';
import { CheckoutPriceDetails } from '@/components/checkout-price-details';
import { cookies, headers } from 'next/headers';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';

async function startCheckout(formData: FormData) {
  'use server';
  // Require authentication for checkout
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/checkout');
  }
  
  // Build items from cart stored in DB using customer_id
  const supabase = getSupabaseServerClient();
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

  const selectedAddressId = String(formData.get('selectedAddressId') || '');
  let shippingAddress: Record<string, unknown>;
  if (selectedAddressId) {
    const supabase = getSupabaseServerClient();
    const { data: addr } = await supabase
      .from('addresses')
      .select('*')
      .match({ id: selectedAddressId, customer_id: authPayload.userId })
      .single();
    if (!addr) {
      throw new Error('Selected address not found');
    }
    shippingAddress = {
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
  } else {
    shippingAddress = {
    name: String(formData.get('name') || ''),
    phone: String(formData.get('phone') || ''),
    pincode: String(formData.get('pincode') || ''),
    address1: String(formData.get('address1') || ''),
    address2: String(formData.get('address2') || ''),
    area: String(formData.get('area') || ''),
    district: String(formData.get('district') || ''),
    state: String(formData.get('state') || ''),
    country: String(formData.get('country') || 'India'),
    landmark: String(formData.get('landmark') || ''),
    addressType: String(formData.get('addressType') || 'HOME')
  };
  }

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

async function gotoPayment(formData: FormData) {
  'use server';
  const addressId = String(formData.get('selectedAddressId') || '');
  const qs = addressId ? `?addressId=${encodeURIComponent(addressId)}` : '';
  redirect(`/payment${qs}` as any);
}

async function saveAddress(formData: FormData) {
  'use server';
  // Require authentication
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/checkout');
  }
  
  const supabase = getSupabaseServerClient();
  const isDefault = String(formData.get('isDefault') || '') === 'on';
  if (isDefault) {
    await supabase.from('addresses').update({ is_default: false }).eq('customer_id', authPayload.userId);
  }
  const doorNo = String(formData.get('doorNo') || '').trim();
  const address1 = String(formData.get('address1') || '').trim();
  // Combine door number with address1 if door number exists
  const line1 = doorNo ? `${doorNo}, ${address1}` : address1;
  
  const baseRecord: Record<string, unknown> = {
    customer_id: authPayload.userId,
    name: String(formData.get('name') || ''),
    phone: String(formData.get('phone') || ''),
    line1: line1,
    line2: String(formData.get('address2') || ''),
    area: String(formData.get('area') || ''),
    city: String(formData.get('district') || ''),
    state: String(formData.get('state') || ''),
    postal_code: String(formData.get('pincode') || ''),
    country: String(formData.get('country') || 'IN'),
    landmark: String(formData.get('landmark') || ''),
    address_type: String(formData.get('addressType') || 'HOME'),
    type: String(formData.get('addressType') || 'HOME'),
    is_default: isDefault
  };
  // Also save door_no separately if the column exists
  if (doorNo) {
    (baseRecord as any).door_no = doorNo;
    (baseRecord as any).door_number = doorNo;
  }
  // Provide common alias keys for varying schemas; unknown ones will be stripped by adaptive insert
  (baseRecord as any).address_line1 = baseRecord.line1;
  (baseRecord as any).address_line2 = baseRecord.line2;
  (baseRecord as any).pincode = baseRecord.postal_code;
  (baseRecord as any).zip_code = baseRecord.postal_code;
  (baseRecord as any).district = baseRecord.city;
  (baseRecord as any).addressType = baseRecord.address_type;
  await insertAddressAdaptive(baseRecord);
  revalidatePath('/checkout');
  redirect('/checkout');
}

async function saveAddressAndProceed(formData: FormData) {
  'use server';
  // Require authentication
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/checkout');
  }
  
  const supabase = getSupabaseServerClient();
  const isDefault = String(formData.get('isDefault') || '') === 'on';
  if (isDefault) {
    await supabase.from('addresses').update({ is_default: false }).eq('customer_id', authPayload.userId);
  }
  const doorNo = String(formData.get('doorNo') || '').trim();
  const address1 = String(formData.get('address1') || '').trim();
  // Combine door number with address1 if door number exists
  const line1 = doorNo ? `${doorNo}, ${address1}` : address1;
  
  const baseRecord: Record<string, unknown> = {
    customer_id: authPayload.userId,
    name: String(formData.get('name') || ''),
    phone: String(formData.get('phone') || ''),
    line1: line1,
    line2: String(formData.get('address2') || ''),
    area: String(formData.get('area') || ''),
    city: String(formData.get('district') || ''),
    state: String(formData.get('state') || ''),
    postal_code: String(formData.get('pincode') || ''),
    country: String(formData.get('country') || 'IN'),
    landmark: String(formData.get('landmark') || ''),
    address_type: String(formData.get('addressType') || 'HOME'),
    type: String(formData.get('addressType') || 'HOME'),
    is_default: isDefault
  };
  // Also save door_no separately if the column exists
  if (doorNo) {
    (baseRecord as any).door_no = doorNo;
    (baseRecord as any).door_number = doorNo;
  }
  (baseRecord as any).address_line1 = baseRecord.line1;
  (baseRecord as any).address_line2 = baseRecord.line2;
  (baseRecord as any).pincode = baseRecord.postal_code;
  (baseRecord as any).zip_code = baseRecord.postal_code;
  (baseRecord as any).district = baseRecord.city;
  (baseRecord as any).addressType = baseRecord.address_type;
  const newId = await insertAddressAdaptive(baseRecord);
  const qs = newId ? `?addressId=${encodeURIComponent(newId)}` : '';
  redirect(`/payment${qs}` as any);
}

async function updateAddressAdaptive(id: string, initial: Record<string, unknown>) {
  const supabase = getSupabaseServerClient();
  const customerId = (initial as any).customer_id;
  let record: Record<string, unknown> = { ...initial };
  // Remove customer_id from update payload (it's used in match)
  delete (record as any).customer_id;
  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await supabase.from('addresses').update(record).match({ id, customer_id: customerId });
    if (!error) return;
    const msg = String((error as any)?.message || '');
    const match = msg.match(/'([^']+)' column/i);
    if (match && match[1]) {
      const missing: string = match[1];
      if (missing in record) {
        const rest: Record<string, unknown> = {};
        for (const key in record) {
          if (key !== missing) {
            rest[key] = record[key];
          }
        }
        record = rest;
        continue;
      }
    }
    console.error('address update failed', error);
    throw new Error(msg || 'Failed to update address');
  }
  throw new Error('Failed to update address after retries');
}

async function updateAddress(formData: FormData) {
  'use server';
  // Require authentication
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    redirect('/login?redirect=/checkout');
  }
  
  const id = String(formData.get('addressId') || '');
  if (!id) throw new Error('Missing addressId');
  const baseRecord: Record<string, unknown> = {
    customer_id: authPayload.userId,
    name: String(formData.get('name') || ''),
    phone: String(formData.get('phone') || ''),
    line1: String(formData.get('address1') || ''),
    line2: String(formData.get('address2') || ''),
    area: String(formData.get('area') || ''),
    city: String(formData.get('district') || ''),
    state: String(formData.get('state') || ''),
    postal_code: String(formData.get('pincode') || ''),
    country: String(formData.get('country') || 'IN'),
    landmark: String(formData.get('landmark') || ''),
    address_type: String(formData.get('addressType') || 'HOME'),
    type: String(formData.get('addressType') || 'HOME')
  };
  (baseRecord as any).address_line1 = baseRecord.line1;
  (baseRecord as any).address_line2 = baseRecord.line2;
  (baseRecord as any).pincode = baseRecord.postal_code;
  (baseRecord as any).zip_code = baseRecord.postal_code;
  (baseRecord as any).district = baseRecord.city;
  (baseRecord as any).addressType = baseRecord.address_type;
  await updateAddressAdaptive(id, baseRecord);
  revalidatePath('/checkout');
  redirect('/checkout');
}

async function insertAddressAdaptive(initial: Record<string, unknown>): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  let record: Record<string, unknown> = { ...initial };
  // Attempt up to N times removing columns the API says are unknown
  for (let attempt = 0; attempt < 12; attempt++) {
    const { data, error } = await supabase.from('addresses').insert(record).select('id').single();
    if (!error) {
      return ((data as any)?.id as string | undefined) ?? null;
    }
    const msg = String((error as any)?.message || '');
    const match = msg.match(/'([^']+)' column/i);
    if (match && match[1]) {
      const missing = match[1];
      if (missing in record) {
        const { [missing]: _, ...rest } = record as any;
        record = rest;
        continue;
      }
    }
    // Handle NOT NULL violations by populating required aliases if possible
    const notNull = msg.match(/null value in column "([^"]+)"/i);
    if (notNull && notNull[1]) {
      const col = notNull[1];
      if (!(col in record)) {
        const source = (name: string) => (initial as any)[name];
        const pick = (...names: string[]): string | undefined => {
          for (const n of names) {
            const v = source(n);
            if (v !== undefined && v !== null && String(v).length > 0) return String(v);
          }
          return undefined;
        };
        let val: string | undefined;
        if (/address_line1/i.test(col)) val = pick('address_line1', 'line1', 'address1');
        else if (/address_line2/i.test(col)) val = pick('address_line2', 'line2', 'address2');
        else if (/postal|pin.*code|zip/i.test(col)) val = pick('postal_code', 'pincode', 'zip_code');
        else if (/city/i.test(col)) val = pick('city', 'district', 'town');
        else if (/district/i.test(col)) val = pick('district', 'city');
        else if (/state/i.test(col)) val = pick('state');
        else if (/country/i.test(col)) val = pick('country');
        else if (/type|address_type/i.test(col)) val = pick('type', 'address_type', 'addressType') ?? 'HOME';
        else if (/name/i.test(col)) val = pick('name');
        else if (/phone|mobile/i.test(col)) val = pick('phone');
        else if (/area/i.test(col)) val = pick('area');
        else if (/landmark/i.test(col)) val = pick('landmark');
        else if (/session/i.test(col)) val = pick('session_id');

        if (val !== undefined) {
          (record as any)[col] = val;
          continue;
        }
      }
    }
    // If not a missing column error, throw
    console.error('address insert failed', error);
    throw new Error(msg || 'Failed to save address');
  }
  throw new Error('Failed to save address after retries');
}

async function fetchAddresses(): Promise<SavedAddress[]> {
  const token = await getAuthToken();
  if (!token) return [];
  
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const res = await fetch(`${base}/api/public/addresses`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data as SavedAddress[]) ?? [];
}

export default async function CheckoutPage() {
  const addresses = await fetchAddresses();
  // Load cart again to compute price details
  const token = await getAuthToken();
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const res = await fetch(`${base}/api/public/cart`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const json = res.ok ? await res.json() : { data: [] };
  const cartItems: Array<{ price?: number; originalPrice?: number; quantity?: number }> = Array.isArray(json?.data) ? json.data : [];
  const mrp = cartItems.reduce((s, it) => s + (Number(it.originalPrice) || Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const total = cartItems.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const discount = Math.max(0, mrp - total);
  const platformFee = cartItems.length > 0 ? 23 : 0;
  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm tracking-wider sm:tracking-widest text-neutral-400 overflow-x-auto">
        <span className="font-medium text-neutral-300 whitespace-nowrap">BAG</span>
        <span className="hidden sm:inline">──────</span>
        <span className="font-semibold text-white whitespace-nowrap">ADDRESS</span>
        <span className="hidden sm:inline">──────</span>
        <span className="font-medium text-neutral-500 whitespace-nowrap">PAYMENT</span>
      </div>

      <div className="mt-6 sm:mt-8 grid gap-6 sm:gap-8 md:grid-cols-3">
        <div className="md:col-span-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
          {addresses.length > 0 ? (
            <AddressSectionWithModal
              addresses={addresses}
              saveAction={saveAddress}
              updateAction={updateAddress}
              proceedAction={gotoPayment}
            />
          ) : (
            <>
              <h2 className="text-lg font-semibold">Add New Address</h2>
              <p className="mt-1 text-sm text-neutral-400">Enter your delivery details. Pin code will auto-detect location.</p>
              <div className="mt-6">
                <AddressForm action={saveAddressAndProceed} />
              </div>
            </>
          )}
        </div>

        <CheckoutPriceDetails mrp={mrp} discount={discount} platformFee={platformFee} total={total} />
      </div>
    </div>
  );
}


