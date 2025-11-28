import { NextResponse } from 'next/server';
import { clearAuthToken } from '@/src/lib/auth';

export async function POST() {
  await clearAuthToken();
  return NextResponse.json({ ok: true });
}

