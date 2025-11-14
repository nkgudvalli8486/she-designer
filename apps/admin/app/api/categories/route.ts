import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';

const CreateCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  imageUrl: z.string().min(1).optional().nullable()
});

export async function GET() {
  // Try service client; fall back to public anon client for read-only if service env is missing
  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    supabase = getSupabaseServerClient();
  }
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, created_at')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = CreateCategorySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, slug, imageUrl } = parsed.data;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, image_url: imageUrl ?? null })
    .select('id, name, slug, image_url, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}


