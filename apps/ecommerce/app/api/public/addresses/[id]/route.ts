import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { requireAuth } from '@/src/lib/auth-middleware';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Require authentication
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseServerClient();
  if (body.is_default === true) {
    await supabase.from('addresses').update({ is_default: false }).eq('customer_id', userId);
  }
  const { data, error } = await supabase
    .from('addresses')
    .update(body)
    .match({ id, customer_id: userId })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  // Require authentication
  const authResult = await requireAuth(_);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('addresses').delete().match({ id, customer_id: userId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


