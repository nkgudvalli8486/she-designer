import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth-middleware';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  // Use admin client to bypass RLS and ensure we can fetch order_items
  const supabase = getSupabaseAdminClient();
  
  const url = new URL(req.url);
  const orderId = url.searchParams.get('id');
  
  if (orderId) {
    // Fetch single order with details
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_cents,
        paid_amount_cents,
        paid_amount,
        refund_amount_cents,
        refund_amount,
        refund_id,
        refund_reason,
        currency,
        shipping_address,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          name,
          title,
          unit_amount_cents,
          unit_price,
          total_price,
          quantity,
          attributes,
          products (
            id,
            name,
            slug,
            product_images (
              image_url,
              position
            )
          )
        )
      `)
      .eq('id', orderId)
      .eq('customer_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Log order items for debugging
    console.log(`Order ${orderId} has ${Array.isArray(order.order_items) ? order.order_items.length : 0} items`);
    
    return NextResponse.json({ data: order });
  } else {
    // Fetch all orders for the customer
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total_cents,
        paid_amount_cents,
        paid_amount,
        refund_amount_cents,
        refund_amount,
        refund_id,
        refund_reason,
        currency,
        created_at,
        order_items (
          id,
          name,
          quantity,
          unit_amount_cents,
          product_id,
          products (
            id,
            name,
            slug,
            product_images (
              image_url,
              position
            )
          )
        )
      `)
      .eq('customer_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Log for debugging
    console.log(`Found ${orders?.length || 0} orders for customer ${userId}`);
    if (orders && orders.length > 0) {
      orders.forEach((order: any) => {
        console.log(`Order ${order.id} has ${Array.isArray(order.order_items) ? order.order_items.length : 0} items`);
      });
    }
    
    return NextResponse.json({ data: orders || [] });
  }
}

