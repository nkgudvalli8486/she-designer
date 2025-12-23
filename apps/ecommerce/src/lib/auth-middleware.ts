import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from './auth';

export async function requireAuth(req: NextRequest): Promise<{ userId: string; email?: string | null } | NextResponse> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || null;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  const payload = await verifyAuthToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  return { userId: payload.userId, email: payload.email ?? null };
}

