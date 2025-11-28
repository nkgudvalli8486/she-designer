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
    // Try Supabase Auth first (if phone provider is enabled)
    const supabase = getSupabaseServerClient();
    const formattedPhone = `+91${phone}`;
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone
      });

      if (!error) {
        // Supabase Auth worked - return success
        return NextResponse.json({ 
          ok: true, 
          message: 'OTP sent successfully to your mobile number'
        });
      }
      
      // If phone provider is disabled, fall back to custom OTP
      if (error.code === 'phone_provider_disabled' || error.message?.includes('phone provider')) {
        console.log('Supabase phone auth disabled, using custom OTP system');
        // Fall through to custom OTP below
      } else {
        // Other error from Supabase
        throw error;
      }
    } catch (supabaseError: any) {
      // If it's not a phone provider error, re-throw it
      if (supabaseError.code !== 'phone_provider_disabled' && !supabaseError.message?.includes('phone provider')) {
        throw supabaseError;
      }
      // Otherwise, fall through to custom OTP
    }
    
    // Fallback: Use custom OTP system
    const otp = await generateOTP(phone);
    await sendOTP(phone, otp);
    
    // In development, return OTP so it can be displayed in UI
    const isDev = process.env.NODE_ENV === 'development' || !process.env.SMS_PROVIDER;
    return NextResponse.json({ 
      ok: true, 
      message: 'OTP sent successfully',
      ...(isDev && { devOtp: otp }) // Include OTP in dev mode
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

