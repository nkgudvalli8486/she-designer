import { redirect } from 'next/navigation';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { CartItems } from '@/components/cart-items';

async function fetchCart() {
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/cart');
  }

  const authPayload = await verifyAuthToken(token);
  if (!authPayload?.userId) {
    redirect('/login?redirect=/cart');
  }

  const supabase = getSupabaseServerClient();
  const { data: items, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity, created_at')
    .eq('customer_id', authPayload.userId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Cart fetch error:', error);
    return [];
  }
  
  if (!items?.length) return [];

  const ids = items.map((x) => x.product_id);
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, sale_price_cents, original_price_cents, product_images (image_url, position)')
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
    const p = prodMap.get(it.product_id) as any;
    const priceCents = Number(p?.sale_price_cents ?? p?.price_cents ?? 0);
    const originalCents = Number(p?.original_price_cents ?? p?.price_cents ?? priceCents);
    const imageUrl = firstImage[it.product_id];
    return {
      productId: it.product_id,
      quantity: it.quantity,
      name: p?.name,
      slug: p?.slug,
      price: priceCents / 100,
      originalPrice: originalCents / 100,
      image: imageUrl ?? undefined
    };
  });
  
  return result;
}

export default async function CartPage() {
  const items = await fetchCart();
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


