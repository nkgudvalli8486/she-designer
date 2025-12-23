import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  const { data: p, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, description, price_cents, sale_price_cents, original_price_cents, stock, category_id, created_at, is_active')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const { data: images } = await supabase
    .from('product_images')
    .select('id, url, image_url, position, alt_text')
    .eq('product_id', id)
    .order('position', { ascending: true });
  const { data: category } = await supabase.from('categories').select('id, name, slug').eq('id', p.category_id).maybeSingle();
  return NextResponse.json({ data: { ...p, images: images ?? [], category } });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdminClient();
  const update: any = {};
  if ('name' in body) update.name = body.name;
  if ('slug' in body) update.slug = body.slug;
  if ('description' in body) update.description = body.description;
  if ('categoryId' in body) update.category_id = body.categoryId || null;
  if ('priceCents' in body) update.price_cents = body.priceCents;
  if ('salePriceCents' in body) update.sale_price_cents = body.salePriceCents ?? null;
  if ('originalPriceCents' in body) update.original_price_cents = body.originalPriceCents ?? null;
  if ('stock' in body) update.stock = body.stock;
  if ('priceCents' in body) update.price = (Number(body.priceCents) || 0) / 100.0;
  if ('originalPriceCents' in body) update.original_price = (Number(body.originalPriceCents) || 0) / 100.0;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('products').update(update).eq('id', id).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (Array.isArray(body.images)) {
    await supabase.from('product_images').delete().eq('product_id', id);
    const imgs = body.images.map((im: any, i: number) => ({
      product_id: id,
      url: im.url,
      position: im.position ?? i
    }));
    const { error: imgErr } = await supabase.from('product_images').insert(imgs);
    if (imgErr) return NextResponse.json({ error: imgErr.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  const url = new URL(req.url);
  const hard = url.searchParams.get('hard') === '1' || url.searchParams.get('mode') === 'hard';

  if (hard) {
    // Hard delete the product (cascades will remove related rows where defined)
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    // Soft delete by marking deleted_at
    const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}


