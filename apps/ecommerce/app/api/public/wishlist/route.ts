import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { rateLimit } from '@/src/lib/rate-limit';
import { randomUUID } from 'crypto';

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

async function getOrCreateSessionId() {
  const store = await cookies();
  let sid = store.get('sid')?.value;
  if (!sid) {
    sid = randomUUID();
    store.set('sid', sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365
    });
  }
  return sid;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`wishlist:${ip}`, 120, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const supabase = getSupabaseServerClient();
  const { data: items, error } = await supabase
    .from('wishlist_items')
    .select('product_id, created_at')
    .eq('session_id', sid)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!items?.length) return NextResponse.json({ data: [] });

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
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`wishlist:${ip}`, 90, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const { productId } = await req.json().catch(() => ({ productId: '' }));
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('wishlist_items')
    .upsert({ session_id: sid, product_id: productId }, { onConflict: 'session_id,product_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`wishlist:${ip}`, 90, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId') || '';
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('wishlist_items').delete().match({ session_id: sid, product_id: productId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}



