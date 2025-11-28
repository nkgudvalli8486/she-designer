import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthToken } from '@/src/lib/auth';
import { CartItems } from '@/components/cart-items';

async function fetchCart() {
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/cart');
  }
  
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const res = await fetch(`${base}/api/public/cart`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return { data: [] as any[] };
  return res.json();
}

export default async function CartPage() {
  const { data } = await fetchCart();
  const items = (data as Array<any>) ?? [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <h1 className="text-xl sm:text-2xl font-semibold">Your Cart</h1>
      <div className="mt-4 sm:mt-6 grid gap-6 md:grid-cols-3">
        <CartItems items={items} subtotal={subtotal} />
      </div>
    </div>
  );
}


