import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';

export async function GET(req: NextRequest) {
  // Get token from Authorization header or cookies
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || await getAuthToken();
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authPayload = await verifyAuthToken(token);
  if (!authPayload?.userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Use admin client to bypass RLS
  const adminSupabase = getSupabaseAdminClient();
  
  // Try to select all columns, but handle missing columns gracefully
  let customer: any = null;
  let error: any = null;
  
  // First try with name column
  let result = await adminSupabase
    .from('customers')
    .select('id, name, email, phone, created_at, auth_user_id')
    .eq('id', authPayload.userId)
    .maybeSingle();
  
  if (result.error) {
    // If name column doesn't exist, try without it
    if (result.error.message?.includes('name') || result.error.code === '42703') {
      result = await adminSupabase
        .from('customers')
        .select('id, email, phone, created_at, auth_user_id')
        .eq('id', authPayload.userId)
        .maybeSingle();
    }
  }
  
  customer = result.data;
  error = result.error;

  if (error) {
    console.error('Customer fetch error:', error);
    return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
  }

  if (!customer) {
    console.error('Customer not found for userId:', authPayload.userId);
    return NextResponse.json({ error: 'User not found', userId: authPayload.userId }, { status: 404 });
  }

  // Ensure name field exists (set to null if column doesn't exist)
  if (!('name' in customer)) {
    customer.name = null;
  }

  return NextResponse.json({ user: customer });
}

