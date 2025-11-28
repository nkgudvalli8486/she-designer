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
    
    // In development/pre-production, return OTP so it can be displayed in UI
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production' || !process.env.SMS_PROVIDER;
    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully',
      ...(isDev && { devOtp: otp }) // Include OTP in dev/pre-prod mode
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

