import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { createRefund, retrieveCheckoutSession } from '@nts/integrations';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await props.params;
  const supabase = getSupabaseAdminClient();
  
  // Fetch order to get payment details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      payment_status,
      total_cents,
      paid_amount_cents,
      metadata,
      stripe_payment_intent_id,
      stripe_charge_id,
      stripe_session_id
    `)
    .eq('id', orderId)
    .single();
  
  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  
  // Check if order can be cancelled
  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
  }
  
  // Process refund if order was paid
  let refundResult: any = null;
  if (order.payment_status === 'paid' && order.paid_amount_cents > 0) {
    const paymentMethod = (order.metadata as any)?.payment_method || 'unknown';
    
    // Only process Stripe refunds automatically
    if (paymentMethod === 'CARD' || order.stripe_payment_intent_id || order.stripe_charge_id || order.stripe_session_id) {
      try {
        // Try to get payment intent from session if we have session_id
        let paymentIntentId = order.stripe_payment_intent_id;
        
        if (!paymentIntentId && order.stripe_session_id) {
          try {
            const session = await retrieveCheckoutSession(order.stripe_session_id);
            paymentIntentId = session.payment_intent as string | undefined || null;
          } catch (error) {
            console.error('Error retrieving session for refund:', error);
          }
        }
        
        if (paymentIntentId) {
          // Create refund using payment intent
          refundResult = await createRefund({
            paymentIntentId,
            amount: order.paid_amount_cents, // Full refund
            reason: 'requested_by_customer',
            metadata: {
              order_id: orderId,
              reason: 'order_cancellation',
              cancelled_by: 'admin'
            }
          });
          
          console.log(`Refund created for order ${orderId}:`, refundResult.id);
        } else if (order.stripe_charge_id) {
          // Create refund using charge ID
          refundResult = await createRefund({
            chargeId: order.stripe_charge_id,
            amount: order.paid_amount_cents,
            reason: 'requested_by_customer',
            metadata: {
              order_id: orderId,
              reason: 'order_cancellation',
              cancelled_by: 'admin'
            }
          });
          
          console.log(`Refund created for order ${orderId}:`, refundResult.id);
        } else {
          console.warn(`Cannot process refund for order ${orderId}: No payment intent or charge ID found`);
        }
      } catch (refundError: any) {
        console.error('Error processing refund:', refundError);
        // Don't fail cancellation if refund fails - admin can process manually
        return NextResponse.json({ 
          error: 'Failed to process refund. Please process manually.',
          details: refundError.message 
        }, { status: 500 });
      }
    } else if (paymentMethod === 'COD') {
      // COD orders don't need refunds
      console.log(`Order ${orderId} is COD - no refund needed`);
    } else if (paymentMethod === 'UPI') {
      // UPI refunds need to be processed manually or via UPI gateway
      console.log(`Order ${orderId} is UPI - refund needs manual processing`);
    }
  }
  
  // Update order status to cancelled
  const updateData: Record<string, unknown> = {
    status: 'cancelled',
    updated_at: new Date().toISOString()
  };
  
  // Update payment status to refunded if refund was processed
  if (refundResult) {
    updateData.payment_status = 'refunded';
    updateData.refund_amount_cents = refundResult.amount || order.paid_amount_cents;
    updateData.refund_amount = (refundResult.amount || order.paid_amount_cents) / 100.0;
    updateData.refund_id = refundResult.id;
    updateData.refund_reason = 'order_cancellation';
  } else if (order.payment_status === 'paid' && order.paid_amount_cents > 0) {
    // If payment was made but refund couldn't be processed, mark for manual review
    updateData.payment_status = 'paid'; // Keep as paid, admin needs to process refund
    updateData.metadata = {
      ...(order.metadata as any || {}),
      cancellation_requested: true,
      cancellation_requested_at: new Date().toISOString(),
      refund_required: true,
      cancelled_by: 'admin'
    };
  }
  
  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);
  
  if (updateError) {
    console.error('Error updating order status:', updateError);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
  
  return NextResponse.json({ 
    success: true, 
    orderId,
    refunded: !!refundResult,
    refundId: refundResult?.id || null
  });
}

