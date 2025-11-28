import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { requireAuth } from '@/src/lib/auth-middleware';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';

async function getOrCreateSessionId() {
  const store = await cookies();
  let sid = store.get('sid')?.value;
  if (!sid) {
    sid = randomUUID();
    store.set('sid', sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365
    });
  }
  return sid;
}

export async function GET(req: NextRequest) {
  // Require authentication for addresses
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  // Require authentication for addresses
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const payload = await req.json().catch(() => ({}));
  // Normalize minimal fields expected
  const record = {
    customer_id: userId,
    name: payload.name ?? null,
    phone: payload.phone ?? null,
    label: payload.addressType ?? 'HOME',
    address_type: payload.addressType ?? 'HOME',
    line1: payload.address1 ?? '',
    line2: payload.address2 ?? null,
    city: payload.district ?? payload.city ?? '',
    state: payload.state ?? '',
    postal_code: payload.pincode ?? '',
    country: payload.country ?? 'IN',
    area: payload.area ?? null,
    landmark: payload.landmark ?? null,
    is_default: Boolean(payload.isDefault)
  };
  if (!record.postal_code || !record.line1 || !record.city || !record.state) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const supabase = getSupabaseServerClient();
  if (record.is_default) {
    await supabase.from('addresses').update({ is_default: false }).eq('customer_id', userId);
  }
  const { data, error } = await supabase.from('addresses').insert(record).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}


