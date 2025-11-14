import { CartItemControls } from '@/components/cart-item-controls';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';

async function fetchCart() {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const sid = cookieStore.get('sid')?.value;
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const res = await fetch(`${base}/api/public/cart`, {
    cache: 'no-store',
    headers: sid ? { cookie: `sid=${sid}` } : undefined
  });
  if (!res.ok) return { data: [] as any[] };
  return res.json();
}

export default async function CartPage() {
  const { data } = await fetchCart();
  const items = (data as Array<any>) ?? [];
  const subtotal = items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  return (
    <div className="container py-10 text-neutral-200">
      <h1 className="text-2xl font-semibold">Your Cart</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {items.length === 0 && <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">Your cart is empty.</div>}
          {items.map((it) => (
            <div key={it.productId} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <Link href={`/products/${it.slug}`} className="flex items-center gap-4 min-w-0">
                <div className="size-16 rounded bg-neutral-800 overflow-hidden shrink-0">
                  {it.image ? <img src={it.image} alt={it.name || ''} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-sm text-neutral-400">₹ {Number(it.price).toFixed(0)}</div>
                </div>
              </Link>
              <div className="flex items-center gap-4">
                <CartItemControls productId={it.productId} quantity={it.quantity} />
                <div>₹ {(it.price * it.quantity).toFixed(0)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 h-fit space-y-3">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>₹ {subtotal.toFixed(0)}</span>
          </div>
          <button className="h-10 w-full rounded-md bg-primary text-primary-foreground">
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  );
}


