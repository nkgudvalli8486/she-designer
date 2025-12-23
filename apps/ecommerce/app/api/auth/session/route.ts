import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { createAuthToken, setAuthToken } from '@/src/lib/auth';

const Schema = z.object({
  accessToken: z.string().min(20)
});

async function getOrCreateCustomer(params: { authUserId: string; email: string }) {
  const admin = getSupabaseAdminClient();

  let { data: customer } = await admin
    .from('customers')
    .select('id, email, auth_user_id')
    .eq('auth_user_id', params.authUserId)
    .maybeSingle();

  if (!customer) {
    const { data: byEmail } = await admin
      .from('customers')
      .select('id, email, auth_user_id')
      .eq('email', params.email)
      .maybeSingle();
    customer = byEmail ?? null;
  }

  if (!customer) {
    const { data: created, error } = await admin
      .from('customers')
      .insert({ auth_user_id: params.authUserId, email: params.email })
      .select('id, email, auth_user_id')
      .single();
    if (error) throw error;
    return created;
  }

  const needsUpdate = (!customer.auth_user_id || customer.auth_user_id !== params.authUserId) || (!customer.email && params.email);
  if (needsUpdate) {
    const { data: updated, error } = await admin
      .from('customers')
      .update({ auth_user_id: params.authUserId, email: customer.email ?? params.email, updated_at: new Date().toISOString() })
      .eq('id', customer.id)
      .select('id, email, auth_user_id')
      .single();
    if (error) throw error;
    return updated;
  }

  return customer;
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Supabase env vars are not set' }, { status: 500 });
  }

  // Verify the Supabase access token and get the user
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${parsed.data.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });

  const authUser = data.user;
  if (!authUser?.id || !authUser.email) {
    return NextResponse.json({ error: 'Auth user missing' }, { status: 401 });
  }

  const customer = await getOrCreateCustomer({ authUserId: authUser.id, email: authUser.email });
  const token = await createAuthToken(customer.id, customer.email ?? authUser.email);
  await setAuthToken(token);

  return NextResponse.json({ ok: true, user: { id: customer.id, email: customer.email ?? authUser.email } });
}


