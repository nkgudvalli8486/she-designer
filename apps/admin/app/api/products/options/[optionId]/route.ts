import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const OptionPatchSchema = z.object({
  name: z.string().optional(),
  values: z.array(z.string()).optional()
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ optionId: string }> }) {
  const { optionId } = await ctx.params;
  const id = optionId;
  const body = await req.json().catch(() => ({}));
  const parsed = OptionPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  const update: any = {};
  if ('name' in parsed.data) update.name = parsed.data.name;
  if ('values' in parsed.data) update.values = parsed.data.values;
  const { error } = await supabase.from('product_options').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ optionId: string }> }) {
  const { optionId } = await ctx.params;
  const id = optionId;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('product_options').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


