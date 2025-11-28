import { NextResponse } from 'next/server';
import { clearAuthToken, verifyAuthToken, getAuthToken } from '@/src/lib/auth';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';

export async function POST() {
  // Get the user ID before clearing the token
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  const userId = authPayload?.userId;

  // Clear auth token
  await clearAuthToken();

  // Optionally clear cart and wishlist items for this user
  if (userId) {
    const supabase = getSupabaseServerClient();
    // Delete cart items
    await supabase.from('cart_items').delete().eq('customer_id', userId);
    // Delete wishlist items
    await supabase.from('wishlist_items').delete().eq('customer_id', userId);
  }

  return NextResponse.json({ ok: true });
}

