import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  imageUrl: z.string().min(1).nullable().optional()
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const update: Record<string, any> = {};
  if (typeof input.name !== 'undefined') update.name = input.name;
  if (typeof input.slug !== 'undefined') update.slug = input.slug;
  if (typeof input.imageUrl !== 'undefined') update.image_url = input.imageUrl ?? null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', id)
    .select('id, name, slug, image_url')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdminClient();
  const url = new URL(req.url);
  const hard = url.searchParams.get('hard') === '1' || url.searchParams.get('mode') === 'hard';

  if (hard) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}


