import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const AppendSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().url(),
      position: z.number().int().nonnegative().optional(),
      alt: z.string().optional()
    })
  )
});

const RemoveSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  urls: z.array(z.string().url()).optional()
});

const ReorderSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().nonnegative()
    })
  )
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = AppendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  const rows = parsed.data.images.map((im, i) => ({
    product_id: id,
    url: im.url,
    image_url: im.url,
    alt_text: im.alt ?? '',
    position: im.position ?? i
  }));
  const { error } = await supabase.from('product_images').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = RemoveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  let query = supabase.from('product_images').delete().eq('product_id', id);
  if (parsed.data.ids && parsed.data.ids.length) {
    query = query.in('id', parsed.data.ids);
  }
  if (parsed.data.urls && parsed.data.urls.length) {
    // delete by either url column
    await supabase.from('product_images').delete().eq('product_id', id).in('url', parsed.data.urls);
    await supabase.from('product_images').delete().eq('product_id', id).in('image_url', parsed.data.urls);
    return NextResponse.json({ ok: true });
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  for (const p of parsed.data.positions) {
    const { error } = await supabase.from('product_images').update({ position: p.position }).eq('id', p.id).eq('product_id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}


