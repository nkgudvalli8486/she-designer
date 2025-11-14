import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const mask = (v: string) => (v ? `${v.slice(0, 8)}…${v.slice(-6)}` : '');
  return NextResponse.json({
    projectUrl: url,
    anonKey: mask(anon),
    serviceKeyPresent: Boolean(service),
  });
}


