import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { generateOTP, sendOTP } from '@/src/lib/otp';
import { z } from 'zod';

const LoginSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits')
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid phone number', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { phone } = parsed.data;
  
  try {
    // Use custom OTP system only (no Supabase phone auth/Twilio)
    const otp = await generateOTP(phone);
    await sendOTP(phone, otp);
    
    // Always return OTP so it can be displayed in UI (same as local)
    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully',
      devOtp: otp // Always include OTP for UI display
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

