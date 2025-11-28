import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth-middleware';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional()
});

export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const json = await req.json().catch(() => ({}));
  const parsed = UpdateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.email !== undefined) updates.email = parsed.data.email;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('customers').update(updates).eq('id', userId).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data });
}

