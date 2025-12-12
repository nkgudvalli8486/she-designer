import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth-middleware';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { getStripe, retrievePaymentIntent, getChargeIdFromPaymentIntent } from '@nts/integrations';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { userId } = authResult;
  const { id: orderId } = await props.params;
  const supabase = getSupabaseAdminClient();
  
  // Fetch order to verify ownership and get payment details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      status,
      payment_status,
      total_cents,
      paid_amount_cents,
      stripe_payment_intent_id,
      stripe_charge_id,
      stripe_session_id,
      created_at
    `)
    .eq('id', orderId)
    .eq('customer_id', userId)
    .single();
  
  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  
  // Check if order has Stripe payment info
  if (!order.stripe_payment_intent_id && !order.stripe_charge_id && !order.stripe_session_id) {
    // Try to find payment info by searching Stripe for recent payments matching this order
    // This is a fallback for orders created before we started storing payment IDs
    try {
      const stripe = getStripe();
      const { retrieveCheckoutSession } = await import('@nts/integrations');
      
      // Search for payment intents created around the order creation time
      const orderDate = new Date(order.created_at || Date.now());
      const startDate = Math.floor((orderDate.getTime() - 24 * 60 * 60 * 1000) / 1000); // 24 hours before
      const endDate = Math.floor((orderDate.getTime() + 24 * 60 * 60 * 1000) / 1000); // 24 hours after
      
      // Try to find payment intents by amount and date
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
        created: { gte: startDate, lte: endDate }
      });
      
      // Find matching payment intent by amount
      const matchingIntent = paymentIntents.data.find(
        pi => Math.abs((pi.amount || 0) - (order.paid_amount_cents || order.total_cents || 0)) < 10
      );
      
      if (matchingIntent) {
        // Update order with found payment intent ID
        await supabase
          .from('orders')
          .update({ stripe_payment_intent_id: matchingIntent.id })
          .eq('id', orderId);
        
        order.stripe_payment_intent_id = matchingIntent.id;
      } else {
        return NextResponse.json({ 
          error: 'Order does not have Stripe payment information. Please ensure the order was paid via Stripe.',
          details: 'This order may have been paid via COD or UPI, or the payment information was not stored.'
        }, { status: 400 });
      }
    } catch (searchError) {
      console.error('Error searching for payment intent:', searchError);
      return NextResponse.json({ 
        error: 'Order does not have Stripe payment information and could not be found in Stripe.',
        details: 'This order may have been paid via COD or UPI.'
      }, { status: 400 });
    }
  }
  
  try {
    const stripe = getStripe();
    const { retrieveCheckoutSession } = await import('@nts/integrations');
    let refunds: any[] = [];
    let chargeId = order.stripe_charge_id;
    
    // If we have session ID but no payment intent, try to get it from session
    if (order.stripe_session_id && !order.stripe_payment_intent_id) {
      try {
        const session = await retrieveCheckoutSession(order.stripe_session_id);
        if (session.payment_intent) {
          const paymentIntentId = typeof session.payment_intent === 'string' 
            ? session.payment_intent 
            : session.payment_intent.id;
          
          // Update order with payment intent ID
          await supabase
            .from('orders')
            .update({ stripe_payment_intent_id: paymentIntentId })
            .eq('id', orderId);
          
          order.stripe_payment_intent_id = paymentIntentId;
        }
      } catch (sessionError) {
        console.error('Error retrieving session:', sessionError);
      }
    }
    
    // Try to get refunds from payment intent
    if (order.stripe_payment_intent_id) {
      const paymentIntent = await retrievePaymentIntent(order.stripe_payment_intent_id);
      
      // Get charge ID if we don't have it
      if (!chargeId && paymentIntent.latest_charge) {
        chargeId = typeof paymentIntent.latest_charge === 'string' 
          ? paymentIntent.latest_charge 
          : paymentIntent.latest_charge.id;
        
        // Update order with charge ID
        if (chargeId) {
          await supabase
            .from('orders')
            .update({ stripe_charge_id: chargeId })
            .eq('id', orderId);
        }
      }
      
      // List refunds for this payment intent
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        if (charge.refunded) {
          // Get refund details
          const refundsList = await stripe.refunds.list({
            charge: chargeId,
            limit: 10
          });
          refunds = refundsList.data;
        }
      }
    }
    
    // If we have charge ID directly, check for refunds
    if (order.stripe_charge_id && refunds.length === 0) {
      const charge = await stripe.charges.retrieve(order.stripe_charge_id);
      if (charge.refunded) {
        const refundsList = await stripe.refunds.list({
          charge: order.stripe_charge_id,
          limit: 10
        });
        refunds = refundsList.data;
      }
    }
    
    // Process refunds if found
    if (refunds.length > 0) {
      // Get the latest/successful refund
      const latestRefund = refunds.find(r => r.status === 'succeeded' || r.status === 'paid') || refunds[0];
      
      const refundAmount = latestRefund.amount || 0;
      const refundStatus = latestRefund.status || 'pending';
      
      // Update order with refund information
      const updateData: Record<string, unknown> = {
        payment_status: refundStatus === 'succeeded' || refundStatus === 'paid' ? 'refunded' : order.payment_status,
        refund_id: latestRefund.id,
        refund_amount_cents: refundAmount,
        refund_amount: refundAmount / 100.0,
        refund_reason: latestRefund.reason || 'requested_by_customer',
        updated_at: new Date().toISOString()
      };
      
      // If full refund, also update order status to cancelled
      if (refundAmount >= (order.paid_amount_cents || 0)) {
        updateData.status = 'cancelled';
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (updateError) {
        console.error('Error updating order with refund info:', updateError);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        refunded: true,
        refundId: latestRefund.id,
        refundAmount: refundAmount / 100.0
      });
    } else {
      // No refunds found
      return NextResponse.json({ 
        success: true, 
        refunded: false,
        message: 'No refunds found for this order'
      });
    }
  } catch (error: any) {
    console.error('Error syncing refund:', error);
    return NextResponse.json({ 
      error: 'Failed to sync refund status',
      details: error.message 
    }, { status: 500 });
  }
}

