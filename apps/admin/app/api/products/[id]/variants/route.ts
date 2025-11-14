import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const VariantSchema = z.object({
  sku: z.string().optional().nullable(),
  attributes: z.record(z.any()).default({}),
  priceCents: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional()
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id, sku, attributes, price_cents, stock, is_active')
    .eq('product_id', id)
    .order('id', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = VariantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('product_variants').insert({
    product_id: id,
    sku: parsed.data.sku ?? null,
    attributes: parsed.data.attributes ?? {},
    price_cents: parsed.data.priceCents ?? null,
    stock: parsed.data.stock ?? 0
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}


