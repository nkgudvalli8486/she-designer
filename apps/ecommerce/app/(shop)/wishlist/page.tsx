import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { RemoveFromWishlist } from '@/components/remove-from-wishlist';
import { AddToCart } from '@/components/add-to-cart';

async function fetchWishlist() {
  const cookieStore = await cookies();
  const hdrs = await headers();
  const sid = cookieStore.get('sid')?.value;
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const res = await fetch(`${base}/api/public/wishlist`, {
    cache: 'no-store',
    headers: sid ? { cookie: `sid=${sid}` } : undefined
  });
  if (!res.ok) return { data: [] as any[] };
  return res.json();
}

export default async function WishlistPage() {
  const { data } = await fetchWishlist();
  const items = (data as Array<any>) ?? [];
  return (
    <div className="container py-10 text-neutral-200">
      <h1 className="text-2xl font-semibold">Your Wishlist</h1>
      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.length === 0 && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            Your wishlist is empty.
          </div>
        )}
        {items.map((it) => (
          <div key={it.product_id} className="rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 hover:shadow-lg transition-shadow">
            <Link href={`/products/${it.slug}`} className="block aspect-[4/3] bg-neutral-800">
              {it.image ? <img src={it.image} alt={it.name || ''} className="h-full w-full object-cover" /> : null}
            </Link>
            <div className="p-2">
              <Link href={`/products/${it.slug}`} className="block font-medium text-neutral-100 line-clamp-2 text-sm">
                {it.name}
              </Link>
              {typeof it.price === 'number' ? (
                <div className="mt-1 text-xs text-neutral-300">₹ {Number(it.price).toFixed(0)}</div>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <AddToCart productId={it.product_id} />
                <RemoveFromWishlist productId={it.product_id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



