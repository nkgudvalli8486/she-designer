'use server';

import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { redirect } from 'next/navigation';
import { retrieveCheckoutSession } from '@nts/integrations';

export async function verifyAndUpdateOrder(sessionId?: string, orderId?: string) {
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  
  if (!authPayload?.userId) {
    return { error: 'Not authenticated' };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  
  // If we have a session_id, verify with Stripe
  if (sessionId) {
    try {
      const session = await retrieveCheckoutSession(sessionId);
      const verifiedOrderId = session.metadata?.orderId as string | undefined;
      const isPaid = session.payment_status === 'paid' || session.status === 'complete';
      
      if (isPaid && verifiedOrderId) {
        // Fetch order
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('total_cents, payment_status')
          .eq('id', verifiedOrderId)
          .eq('customer_id', authPayload.userId)
          .single();
        
        if (order && order.payment_status !== 'paid') {
          const paidAmount = session.amount_total || order.total_cents;
          
          // Update order
          await supabaseAdmin
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'processing',
              paid_amount_cents: paidAmount,
              paid_amount: paidAmount / 100.0
            })
            .eq('id', verifiedOrderId);
        }
        
        // Clear cart
        await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('customer_id', authPayload.userId);
        
        return { success: true, orderId: verifiedOrderId };
      }
    } catch (error) {
      console.error('Error verifying Stripe session:', error);
    }
  }
  
  // Fallback: Update most recent unpaid order if provided
  if (orderId) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('total_cents, payment_status, created_at')
      .eq('id', orderId)
      .eq('customer_id', authPayload.userId)
      .single();
    
    if (order && order.payment_status === 'unpaid') {
      const orderAge = Date.now() - new Date(order.created_at).getTime();
      if (orderAge < 15 * 60 * 1000) { // Within 15 minutes
        await supabaseAdmin
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            paid_amount_cents: order.total_cents,
            paid_amount: order.total_cents / 100.0
          })
          .eq('id', orderId);
        
        // Clear cart
        await supabaseAdmin
          .from('cart_items')
          .delete()
          .eq('customer_id', authPayload.userId);
        
        return { success: true, orderId };
      }
    }
  }
  
  // Always clear cart if we're on success page
  await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('customer_id', authPayload.userId);
  
  return { success: true };
}

