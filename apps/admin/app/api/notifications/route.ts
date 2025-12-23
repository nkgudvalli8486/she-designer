import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  
  // Get recent orders (last 24 hours) as notifications
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  
  let query = supabase
    .from('orders')
    .select(`
      id,
      status,
      payment_status,
      total_cents,
      currency,
      created_at,
      customers (
        name,
        email
      )
    `)
    .gte('created_at', twentyFourHoursAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(50);
  
  const { data: orders, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Format as notifications
  const notifications = (orders || []).map((order: any) => ({
    id: order.id,
    type: 'new_order',
    title: 'New Order',
    message: `New order from ${order.customers?.name || 'Guest'}`,
    amount: order.total_cents,
    currency: order.currency,
    status: order.status,
    payment_status: order.payment_status,
    createdAt: order.created_at,
    read: false
  }));
  
  return NextResponse.json({ notifications });
}

