'use server';

import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { getStripe, retrievePaymentIntent, retrieveCheckoutSession } from '@nts/integrations';

export async function autoSyncRefund(orderId: string) {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  
  const authPayload = token ? await verifyAuthToken(token) : null;
  if (!authPayload?.userId) {
    return { success: false, error: 'Not authenticated' };
  }
  
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
    .eq('customer_id', authPayload.userId)
    .single();
  
  if (orderError || !order) {
    return { success: false, error: 'Order not found' };
  }
  
  // Only auto-sync if order is cancelled and payment is still paid (refund pending)
  // OR if payment status is paid but we want to check for refunds anyway
  const shouldCheckRefund = 
    (order.status === 'cancelled' && order.payment_status === 'paid') ||
    (order.payment_status === 'paid' && order.paid_amount_cents > 0);

  if (!shouldCheckRefund) {
    return { success: true, synced: false, message: 'No sync needed' };
  }

  // If no payment info stored, try to find it by searching Stripe checkout sessions
  if (!order.stripe_payment_intent_id && !order.stripe_charge_id && !order.stripe_session_id) {
    console.log(`Order ${orderId} has no Stripe payment info stored, searching Stripe...`);
    
    try {
      const stripe = getStripe();
      
      // Search for checkout sessions with this orderId in metadata
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: {
          gte: Math.floor((new Date(order.created_at).getTime() - 7 * 24 * 60 * 60 * 1000) / 1000) // 7 days before
        }
      });
      
      // Find session with matching orderId in metadata
      const matchingSession = sessions.data.find(
        s => s.metadata?.orderId === orderId
      );
      
      if (matchingSession) {
        console.log(`Found checkout session ${matchingSession.id} for order ${orderId}`);
        
        // Get payment intent from session
        let paymentIntentId: string | undefined;
        if (matchingSession.payment_intent) {
          paymentIntentId = typeof matchingSession.payment_intent === 'string'
            ? matchingSession.payment_intent
            : matchingSession.payment_intent.id;
        }
        
        // Update order with found payment info
        const updateData: Record<string, unknown> = {
          stripe_session_id: matchingSession.id
        };
        
        if (paymentIntentId) {
          updateData.stripe_payment_intent_id = paymentIntentId;
          order.stripe_payment_intent_id = paymentIntentId;
        }
        
        await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);
        
        console.log(`Updated order ${orderId} with payment info from Stripe`);
      } else {
        console.log(`No matching checkout session found for order ${orderId}`);
        return { success: true, synced: false, message: 'No Stripe payment info found' };
      }
    } catch (searchError: any) {
      console.error('Error searching Stripe for payment info:', searchError?.message || searchError);
      return { success: true, synced: false, message: 'Could not find payment info in Stripe' };
    }
  }

  console.log(`Checking refunds for order ${orderId}`, {
    payment_intent: order.stripe_payment_intent_id,
    charge_id: order.stripe_charge_id,
    session_id: order.stripe_session_id
  });
  
  try {
    const stripe = getStripe();
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
      
      // List refunds by payment intent (more reliable)
      try {
        console.log(`Listing refunds for payment intent: ${order.stripe_payment_intent_id}`);
        const refundsList = await stripe.refunds.list({
          payment_intent: order.stripe_payment_intent_id,
          limit: 10
        });
        console.log(`Found ${refundsList.data.length} refunds for payment intent`);
        if (refundsList.data.length > 0) {
          refunds = refundsList.data;
          console.log('Refunds found:', refunds.map(r => ({ id: r.id, amount: r.amount, status: r.status })));
        }
      } catch (refundListError: any) {
        console.error('Error listing refunds by payment intent:', refundListError?.message || refundListError);
        // If payment_intent parameter doesn't work, try without it and filter
        try {
          const allRefunds = await stripe.refunds.list({ limit: 100 });
          const matchingRefunds = allRefunds.data.filter(r => 
            (r.payment_intent && typeof r.payment_intent === 'string' && r.payment_intent === order.stripe_payment_intent_id) ||
            (r.payment_intent && typeof r.payment_intent === 'object' && r.payment_intent.id === order.stripe_payment_intent_id)
          );
          if (matchingRefunds.length > 0) {
            refunds = matchingRefunds;
            console.log(`Found ${refunds.length} refunds via filtered search`);
          }
        } catch (fallbackError) {
          console.error('Fallback refund search also failed:', fallbackError);
        }
      }
      
      // Also check by charge ID if we have it
      if (chargeId && refunds.length === 0) {
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          if (charge.refunded) {
            // Get refund details
            const refundsList = await stripe.refunds.list({
              charge: chargeId,
              limit: 10
            });
            refunds = refundsList.data;
          }
        } catch (chargeError) {
          console.error('Error retrieving charge:', chargeError);
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
      // Get the latest/successful refund (prefer succeeded/paid status)
      const latestRefund = refunds
        .sort((a, b) => (b.created || 0) - (a.created || 0)) // Sort by created date, newest first
        .find(r => r.status === 'succeeded' || r.status === 'paid') || refunds[0];
      
      const refundAmount = latestRefund.amount || 0;
      const refundStatus = latestRefund.status || 'pending';
      
      console.log(`Processing refund: ${latestRefund.id}, amount: ${refundAmount}, status: ${refundStatus}`);
      
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
        console.log('Full refund detected, marking order as cancelled');
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (updateError) {
        console.error('Error updating order with refund info:', updateError);
        return { success: false, error: 'Failed to update order', details: updateError.message };
      }
      
      console.log(`Successfully updated order ${orderId} with refund ${latestRefund.id}`);
      return { 
        success: true, 
        synced: true,
        refunded: true,
        refundId: latestRefund.id,
        refundAmount: refundAmount / 100.0
      };
    } else {
      // No refunds found
      console.log(`No refunds found for order ${orderId}`);
      return { 
        success: true, 
        synced: true,
        refunded: false,
        message: 'No refunds found for this order'
      };
    }
  } catch (error: any) {
    console.error('Error auto-syncing refund:', error);
    // Don't fail the page load if sync fails - just log it
    return { success: false, error: error.message, synced: false };
  }
}

