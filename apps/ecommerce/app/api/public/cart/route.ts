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
  const rl = rateLimit(`cart:${ip}`, 120, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const supabase = getSupabaseServerClient();
  const { data: items, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('session_id', sid)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!items?.length) return NextResponse.json({ data: [] });
  const ids = items.map((it) => it.product_id);
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, sale_price_cents')
    .in('id', ids);
  const { data: imgs } = await supabase
    .from('product_images')
    .select('product_id, image_url, position')
    .in('product_id', ids)
    .order('position', { ascending: true });
  const firstImage: Record<string, string | null> = {};
  for (const im of imgs ?? []) {
    const pid = (im as any).product_id as string;
    if (!(pid in firstImage)) firstImage[pid] = ((im as any).image_url) ?? null;
  }
  const prodMap = new Map((products ?? []).map((p: any) => [p.id, p]));
  const result = items.map((it) => {
    const p = prodMap.get(it.product_id);
    const price = (p?.sale_price_cents ?? p?.price_cents ?? 0) / 100;
    return { productId: it.product_id, name: p?.name, slug: p?.slug, price, quantity: it.quantity, image: firstImage[it.product_id] ?? null };
  });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`cart:${ip}`, 90, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const { productId, quantity } = await req.json().catch(() => ({ productId: '', quantity: 1 }));
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  const qty = Math.max(1, parseInt(String(quantity || 1), 10));
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('cart_items')
    .upsert({ session_id: sid, product_id: productId, quantity: qty }, { onConflict: 'session_id,product_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`cart:${ip}`, 90, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId') || '';
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('cart_items').delete().match({ session_id: sid, product_id: productId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`cart:${ip}`, 90, 60_000);
  if (!rl.ok) return new NextResponse('Too Many Requests', { status: 429 });
  const sid = await getOrCreateSessionId();
  const body = await req.json().catch(() => ({} as any));
  const productId = String(body?.productId || '');
  const op = String(body?.op || '').toLowerCase(); // 'inc' | 'dec' | ''
  const qtyRaw = body?.quantity;
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: row } = await supabase
    .from('cart_items')
    .select('quantity')
    .eq('session_id', sid)
    .eq('product_id', productId)
    .maybeSingle();

  let newQty: number | null = null;
  if (op === 'inc') {
    const current = Number(row?.quantity ?? 0);
    newQty = current + 1;
  } else if (op === 'dec') {
    const current = Number(row?.quantity ?? 0);
    newQty = current - 1;
  } else if (qtyRaw !== undefined) {
    const parsed = Math.max(0, parseInt(String(qtyRaw), 10));
    newQty = Number.isFinite(parsed) ? parsed : null;
  }

  if (newQty === null) {
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  }

  if (newQty <= 0) {
    const { error } = await supabase.from('cart_items').delete().match({ session_id: sid, product_id: productId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, quantity: 0 });
  }

  const { error } = await supabase
    .from('cart_items')
    .upsert({ session_id: sid, product_id: productId, quantity: newQty }, { onConflict: 'session_id,product_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, quantity: newQty });
}


