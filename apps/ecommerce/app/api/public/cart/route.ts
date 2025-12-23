import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { requireAuth } from '@/src/lib/auth-middleware';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';

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
  // Require authentication for cart access
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  const { data: items, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity, created_at, attributes')
    .eq('customer_id', userId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!items?.length) return NextResponse.json({ data: [] });

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
  const result = items.map((it: any) => {
    const p = prodMap.get(it.product_id) as any;
    const priceCents = Number(p?.sale_price_cents ?? p?.price_cents ?? 0);
    const originalCents = Number(p?.original_price_cents ?? p?.price_cents ?? priceCents);
    return {
      productId: it.product_id,
      quantity: it.quantity,
      name: p?.name,
      slug: p?.slug,
      price: priceCents / 100,
      originalPrice: originalCents / 100,
      image: firstImage[it.product_id] ?? null,
      attributes: it.attributes || null
    };
  });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  // Require authentication for cart operations
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const body = await req.json().catch(() => ({ productId: '', quantity: 1 }));
  const { productId, quantity, attributes } = body;
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  const qty = Math.max(1, Number(quantity ?? 1));
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  
  // Check product stock
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();
  
  if (product && product.stock !== null && qty > product.stock) {
    return NextResponse.json({ 
      error: `Only ${product.stock} item${product.stock === 1 ? '' : 's'} available in stock` 
    }, { status: 400 });
  }
  
  // Prepare attributes (custom measurements) as JSONB
  const attributesData = attributes && typeof attributes === 'object' ? attributes : null;
  
  // Check if item already exists
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('customer_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  
  if (existing) {
    // When adding to cart, if item exists, add to existing quantity
    const totalQty = existing.quantity + qty;
    if (product && product.stock !== null && totalQty > product.stock) {
      return NextResponse.json({ 
        error: `Only ${product.stock} item${product.stock === 1 ? '' : 's'} available in stock. You already have ${existing.quantity} in cart.` 
      }, { status: 400 });
    }
    
    const updateData: any = { quantity: totalQty };
    if (attributesData) {
      updateData.attributes = attributesData;
    }
    const { error } = await supabase
      .from('cart_items')
      .update(updateData)
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    // Insert new item - explicitly set session_id to null for authenticated users
    const insertData: any = { 
      customer_id: userId, 
      product_id: productId, 
      quantity: qty,
      session_id: null // Explicitly set to null for authenticated users
    };
    if (attributesData) {
      insertData.attributes = attributesData;
    }
    const { error } = await supabase
      .from('cart_items')
      .insert(insertData);
    if (error) {
      console.error('Cart insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }
  
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  // Require authentication for cart operations
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const body = await req.json().catch(() => ({} as any));
  const productId = String(body.productId || '');
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  
  // Check product stock
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();
  
  if (body.op === 'inc' || body.op === 'dec') {
    const { data: row } = await supabase.from('cart_items').select('quantity').match({ customer_id: userId, product_id: productId }).single();
    const current = Number(row?.quantity ?? 0);
    let next = body.op === 'inc' ? current + 1 : Math.max(1, current - 1);
    
    // Validate stock when increasing
    if (body.op === 'inc' && product && product.stock !== null && next > product.stock) {
      return NextResponse.json({ 
        error: `Only ${product.stock} item${product.stock === 1 ? '' : 's'} available in stock` 
      }, { status: 400 });
    }
    
    const { error } = await supabase.from('cart_items').update({ quantity: next }).match({ customer_id: userId, product_id: productId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (typeof body.quantity === 'number') {
    const qty = Math.max(1, Math.floor(body.quantity));
    
    // Validate stock when setting quantity
    if (product && product.stock !== null && qty > product.stock) {
      return NextResponse.json({ 
        error: `Only ${product.stock} item${product.stock === 1 ? '' : 's'} available in stock` 
      }, { status: 400 });
    }
    
    const { error } = await supabase.from('cart_items').update({ quantity: qty }).match({ customer_id: userId, product_id: productId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  // Require authentication for cart operations
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId') || '';
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('cart_items').delete().match({ customer_id: userId, product_id: productId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


