import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const OptionSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string()).min(1)
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('product_options')
    .select('id, product_id, name, values')
    .eq('product_id', id)
    .order('id', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = OptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from('product_options').insert({
    product_id: id,
    name: parsed.data.name,
    values: parsed.data.values
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}


