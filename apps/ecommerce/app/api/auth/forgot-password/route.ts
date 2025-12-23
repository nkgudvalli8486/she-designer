import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { z } from 'zod';

const Schema = z.object({
  email: z.string().email()
});

function getBaseUrl(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  return process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const baseUrl = getBaseUrl(req);
  const redirectTo = `${baseUrl}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}


