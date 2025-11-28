import { redirect } from 'next/navigation';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { WishlistItems } from '@/components/wishlist-items';

async function fetchWishlist() {
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  
  if (!authPayload?.userId) {
    return { data: [] as any[] };
  }
  
  const supabase = getSupabaseServerClient();
  const { data: items, error } = await supabase
    .from('wishlist_items')
    .select('product_id, created_at')
    .eq('customer_id', authPayload.userId)
    .order('created_at', { ascending: false });
  
  if (error || !items?.length) return { data: [] as any[] };

  const ids = items.map((it) => it.product_id);
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, sale_price_cents, product_images (image_url, position)')
    .in('id', ids);

  const firstImage: Record<string, string | null> = {};
  for (const p of products ?? []) {
    const pid = (p as any).id as string;
    const imgs = (p as any).product_images as Array<{ image_url?: string | null; position?: number }> | undefined;
    if (Array.isArray(imgs) && imgs.length) {
      const sorted = imgs.length > 1 ? [...imgs].sort((a, b) => (Number(a?.position ?? 0) - Number(b?.position ?? 0))) : imgs;
      const top = sorted[0];
      const imageUrl = (top?.image_url as string | null | undefined) ?? null;
      if (imageUrl) firstImage[pid] = imageUrl;
    }
  }

  const prodMap = new Map((products ?? []).map((p: any) => [p.id, p]));
  const result = items.map((it) => {
    const p = prodMap.get(it.product_id);
    const price = (p?.sale_price_cents ?? p?.price_cents ?? 0) / 100;
    return { product_id: it.product_id, name: p?.name, slug: p?.slug, price, image: firstImage[it.product_id] ?? null };
  });
  
  return { data: result };
}

export default async function WishlistPage() {
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  
  if (!authPayload?.userId) {
    redirect('/login?redirect=/wishlist');
  }
  
  const { data } = await fetchWishlist();
  const items = (data as Array<any>) ?? [];
  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <h1 className="text-xl sm:text-2xl font-semibold">Your Wishlist</h1>
      <WishlistItems items={items} />
    </div>
  );
}



