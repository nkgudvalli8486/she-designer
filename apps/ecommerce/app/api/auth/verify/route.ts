import { NextRequest, NextResponse } from 'next/server';
import { createAuthToken, setAuthToken } from '@/src/lib/auth';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { verifyOTP } from '@/src/lib/otp';
import { z } from 'zod';

const VerifySchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  otp: z.string().regex(/^[0-9]{6}$/, 'OTP must be 6 digits')
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = VerifySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { phone, otp } = parsed.data;
  
  try {
    // Use custom OTP verification only (no Supabase phone auth/Twilio)
    const isValid = await verifyOTP(phone, otp);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    
    // No Supabase Auth user ID since we're not using Supabase phone auth
    const authUserId: string | null = null;

    // Get or create customer record
    // Use admin client to bypass RLS for customer creation
    const adminSupabase = getSupabaseAdminClient();
    
    let { data: customer } = await adminSupabase
      .from('customers')
      .select('id, auth_user_id')
      .eq('phone', phone)
      .single();

    if (!customer) {
      // Create customer record using admin client (bypasses RLS)
      // For phone-only auth, email can be null or a placeholder
      const insertData: Record<string, unknown> = {
        auth_user_id: authUserId || null,
        phone: phone
      };
      
      // Provide email - use from Supabase Auth if available, otherwise use unique placeholder
      if (authUserId) {
        try {
          // Try to get email from Supabase Auth user if available (requires admin client)
          const { data: authUser } = await adminSupabase.auth.admin.getUserById(authUserId);
          if (authUser?.user?.email) {
            insertData.email = authUser.user.email;
          } else {
            // Use unique placeholder email for phone-only auth (phone is unique, so email will be unique)
            insertData.email = `phone_${phone}@shedesigner.in`;
          }
        } catch (err) {
          // If we can't get email, use unique placeholder
          insertData.email = `phone_${phone}@shedesigner.in`;
        }
      } else {
        // Use unique placeholder email for phone-only auth (phone is unique, so email will be unique)
        insertData.email = `phone_${phone}@shedesigner.in`;
      }
      
      const { data: newCustomer, error: insertError } = await adminSupabase
        .from('customers')
        .insert(insertData)
        .select('id, auth_user_id')
        .single();
      
      if (insertError) {
        console.error('Customer creation error:', insertError);
        // If insert fails (e.g., duplicate phone), try to fetch again
        const { data: existingCustomer } = await adminSupabase
          .from('customers')
          .select('id, auth_user_id')
          .eq('phone', phone)
          .single();
        customer = existingCustomer;
        
        if (!customer) {
          throw insertError;
        }
      } else {
        customer = newCustomer;
      }
    } else if (authUserId && !customer.auth_user_id) {
      // Update existing customer with auth_user_id if we got one from Supabase
      await adminSupabase
        .from('customers')
        .update({ auth_user_id: authUserId })
        .eq('id', customer.id);
    }

    // Create our JWT token for API authentication
    const token = await createAuthToken(customer.id, phone);
    await setAuthToken(token);

    return NextResponse.json({
      ok: true,
      token,
      user: { id: customer.id, phone }
    });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}


