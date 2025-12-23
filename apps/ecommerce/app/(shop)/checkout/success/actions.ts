'use server';

import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { retrieveCheckoutSession } from '@nts/integrations';
import { deductStockForOrder } from '@/src/lib/stock';

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
        // Fetch order + items (needed for stock deduction)
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select(`
            id,
            total_cents,
            payment_status,
            metadata,
            order_items (
              product_id,
              quantity
            )
          `)
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
              paid_amount: paidAmount / 100.0,
              metadata: {
                ...(((order as any).metadata && typeof (order as any).metadata === 'object') ? (order as any).metadata : {}),
                stripe_session_id: sessionId
              }
            })
            .eq('id', verifiedOrderId);
        }

        // Deduct stock once (idempotent via metadata flag)
        const metadata = ((order as any)?.metadata && typeof (order as any).metadata === 'object') ? (order as any).metadata : {};
        const alreadyDeducted = metadata?.stock_deducted === true;
        const items = ((order as any)?.order_items || []) as Array<{ product_id: string; quantity: number }>;
        if (!alreadyDeducted && items.length > 0) {
          await deductStockForOrder(items.map((it) => ({ product_id: it.product_id, quantity: Number(it.quantity) || 1 })));
          await supabaseAdmin
            .from('orders')
            .update({
              metadata: {
                ...metadata,
                stock_deducted: true,
                stripe_session_id: sessionId
              }
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
  
  // Always clear cart if we're on success page
  await supabaseAdmin
    .from('cart_items')
    .delete()
    .eq('customer_id', authPayload.userId);
  
  return { success: true };
}

