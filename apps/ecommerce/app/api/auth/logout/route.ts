import { NextResponse } from 'next/server';
import { clearAuthToken, verifyAuthToken, getAuthToken } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function POST() {
  // Get the user ID before clearing the token
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  const userId = authPayload?.userId;

  // Clear auth token
  await clearAuthToken();

  // Optionally clear cart and wishlist items for this user
  if (userId) {
    // Use admin client to bypass RLS (app uses its own auth cookie, not Supabase session)
    const supabase = getSupabaseAdminClient();
    // Delete cart items
    await supabase.from('cart_items').delete().eq('customer_id', userId);
    // Delete wishlist items
    await supabase.from('wishlist_items').delete().eq('customer_id', userId);
  }

  return NextResponse.json({ ok: true });
}

