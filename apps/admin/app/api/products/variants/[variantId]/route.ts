import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const VariantPatchSchema = z.object({
  sku: z.string().optional().nullable(),
  attributes: z.record(z.any()).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await ctx.params;
  const id = variantId;
  const body = await req.json().catch(() => ({}));
  const parsed = VariantPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  const update: any = {};
  if ('sku' in parsed.data) update.sku = parsed.data.sku ?? null;
  if ('attributes' in parsed.data) update.attributes = parsed.data.attributes ?? {};
  if ('priceCents' in parsed.data) update.price_cents = parsed.data.priceCents;
  if ('stock' in parsed.data) update.stock = parsed.data.stock;
  if ('isActive' in parsed.data) update.is_active = parsed.data.isActive;
  const { error } = await supabase.from('product_variants').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await ctx.params;
  const id = variantId;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


