import { cookies, headers } from 'next/headers';
import { WishlistItems } from '@/components/wishlist-items';

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
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <h1 className="text-xl sm:text-2xl font-semibold">Your Wishlist</h1>
      <WishlistItems items={items} />
    </div>
  );
}



