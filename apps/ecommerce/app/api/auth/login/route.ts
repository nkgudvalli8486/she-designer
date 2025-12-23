import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { createAuthToken, setAuthToken } from '@/src/lib/auth';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  mode: z.enum(['signin', 'signup']).optional()
});

async function getOrCreateCustomer(params: { authUserId: string; email: string }) {
  const admin = getSupabaseAdminClient();

  // Prefer auth_user_id mapping
  let { data: customer } = await admin
    .from('customers')
    .select('id, email, auth_user_id')
    .eq('auth_user_id', params.authUserId)
    .maybeSingle();

  // Fallback: existing customer row by email (e.g. migrated/legacy)
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
      .insert({
        auth_user_id: params.authUserId,
        email: params.email
      })
      .select('id, email, auth_user_id')
      .single();
    if (error) throw error;
    return created;
  }

  // Ensure auth_user_id/email are set
  const needsUpdate = (!customer.auth_user_id || customer.auth_user_id !== params.authUserId) || (!customer.email && params.email);
  if (needsUpdate) {
    const { data: updated, error } = await admin
      .from('customers')
      .update({
        auth_user_id: params.authUserId,
        email: customer.email ?? params.email,
        updated_at: new Date().toISOString()
      })
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
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { email, password, mode } = parsed.data;
    const supabase = getSupabaseServerClient();

    // Sign in or sign up using Supabase Auth (email/password)
    const authRes =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (authRes.error) {
      return NextResponse.json({ error: authRes.error.message }, { status: 400 });
    }

    const authUser = authRes.data.user;
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Auth user not found' }, { status: 400 });
    }

    const customer = await getOrCreateCustomer({ authUserId: authUser.id, email: authUser.email || email });

    const token = await createAuthToken(customer.id, customer.email ?? email);
    await setAuthToken(token);

    return NextResponse.json({
      ok: true,
      token,
      user: { id: customer.id, email: customer.email ?? email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

