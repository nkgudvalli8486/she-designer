import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Phone OTP login has been removed in favor of email + Google OAuth (Supabase Auth).
  // Keeping this route to avoid breaking old clients; return 410 to indicate removal.
  void req;
  return NextResponse.json(
    { error: 'Mobile OTP login removed. Please use Email or Google sign-in.' },
    { status: 410 }
  );
}


