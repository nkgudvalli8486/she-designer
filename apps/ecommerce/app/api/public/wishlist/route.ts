import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { rateLimit } from '@/src/lib/rate-limit';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/src/lib/auth-middleware';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';

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
  
  // Require authentication for wishlist access
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  const { data: items, error } = await supabase
    .from('wishlist_items')
    .select('product_id, created_at')
    .eq('customer_id', userId)
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
  
  // Require authentication for wishlist operations
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { productId } = body;
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid productId' }, { status: 400 });
  }
  
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  
  // Check if item already exists
  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('customer_id', userId)
    .eq('product_id', productId)
    .single();
  
  if (existing) {
    // Already in wishlist, return success
    return NextResponse.json({ ok: true });
  }
  
  // Insert new item
  const { error } = await supabase
    .from('wishlist_items')
    .insert({ customer_id: userId, product_id: productId });
  
  if (error) {
    console.error('Wishlist insert error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add to wishlist' }, { status: 400 });
  }
  
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`wishlist:${ip}`, 90, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  
  // Require authentication for wishlist operations
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId') || '';
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('wishlist_items').delete().match({ customer_id: userId, product_id: productId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}



