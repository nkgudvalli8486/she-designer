import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhook, createShiprocketOrder, getChargeIdFromPaymentIntent } from '@nts/integrations';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

// This route handles webhooks at /api/webhook/stripe
// (alternative path to /api/stripe/webhook for compatibility)
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature') || '';
  const raw = await req.text();
  try {
    console.log('Stripe webhook received at /api/webhook/stripe');
    const event = verifyStripeWebhook({ payload: raw, signature });
    console.log('Stripe webhook event type:', event.type);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderId = session?.metadata?.orderId as string | undefined;
      console.log('Checkout session completed, orderId:', orderId);
      
      if (orderId) {
        const supabase = getSupabaseAdminClient();
        
        // Fetch order to get customer_id for cart clearing
        const { data: orderForCart, error: orderFetchError } = await supabase
          .from('orders')
          .select('customer_id, payment_status')
          .eq('id', orderId)
          .single();
        
        if (orderFetchError) {
          console.error('Error fetching order for cart clearing:', orderFetchError);
        }
        
        if (!orderForCart) {
          console.error(`Order ${orderId} not found`);
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        // Check if already processed
        if (orderForCart.payment_status === 'paid') {
          console.log(`Order ${orderId} already marked as paid, skipping update`);
        } else {
          // Get payment amount from Stripe session
          // Stripe checkout session has amount_total in cents
          const amountPaid = session.amount_total || 0;
          const paidAmount = typeof amountPaid === 'number' ? amountPaid : 0;
          
          // Fetch order to get total_cents for comparison
          const { data: orderData } = await supabase
            .from('orders')
            .select('total_cents')
            .eq('id', orderId)
            .single();
          
          // Use order total if Stripe amount is 0 or not available
          const finalPaidAmount = paidAmount > 0 ? paidAmount : (orderData?.total_cents || 0);
          
          console.log(`Updating order ${orderId}: payment_status=paid, paid_amount_cents=${finalPaidAmount}`);
          
          // Get payment intent ID from session for refund tracking
          const paymentIntentId = session.payment_intent as string | undefined;
          let chargeId = session.payment_intent ? undefined : (session as any).charge?.id;
          
          // If we have payment intent but no charge ID, try to get it
          if (paymentIntentId && !chargeId) {
            try {
              chargeId = await getChargeIdFromPaymentIntent(paymentIntentId);
            } catch (error) {
              console.warn('Could not retrieve charge ID from payment intent:', error);
            }
          }
          
          // Update order status and paid amount
          const updateData: Record<string, unknown> = {
            payment_status: 'paid', 
            status: 'processing',
            paid_amount_cents: finalPaidAmount,
            paid_amount: finalPaidAmount / 100.0,
            stripe_session_id: session.id
          };
          
          if (paymentIntentId) {
            updateData.stripe_payment_intent_id = paymentIntentId;
          }
          if (chargeId) {
            updateData.stripe_charge_id = chargeId;
          }
          
          const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);
          
          if (updateError) {
            console.error('Error updating order status:', updateError);
          } else {
            console.log(`Successfully updated order ${orderId} to paid status`);
          }
        }
        
        // Clear cart items for this customer after successful payment
        // Clear ALL cart items for the customer (they've completed checkout)
        if (orderForCart?.customer_id) {
          console.log(`Clearing cart for customer ${orderForCart.customer_id}`);
          const { error: cartError, data: deletedItems } = await supabase
            .from('cart_items')
            .delete()
            .eq('customer_id', orderForCart.customer_id)
            .select();
          
          if (cartError) {
            console.error('Failed to clear cart after payment:', cartError);
          } else {
            console.log(`Cleared ${deletedItems?.length || 0} cart items for customer ${orderForCart.customer_id} after order ${orderId}`);
          }
        }
        
        // Optionally create a Shiprocket order with real data
        try {
          // Fetch order with customer and order items
          const { data: order } = await supabase
            .from('orders')
            .select(`
              id,
              customer_id,
              shipping_address,
              total_cents,
              order_items (
                name,
                unit_amount_cents,
                quantity,
                product_id,
                products (
                  sku
                )
              ),
              customers (
                name,
                email,
                phone
              )
            `)
            .eq('id', orderId)
            .single();

          if (order) {
            const shippingAddr = (order.shipping_address || {}) as any;
            const customer = (order.customers || {}) as any;
            const items = (order.order_items || []) as Array<any>;

            // Create Shiprocket order with real data
            await createShiprocketOrder({
              order_id: order.id,
              order_date: new Date().toISOString(),
              pickup_location: 'Primary', // Configure this based on your Shiprocket settings
              billing_customer_name: customer.name || '',
              billing_last_name: '',
              billing_address: shippingAddr.address1 || '',
              billing_address_2: shippingAddr.address2 || '',
              billing_city: shippingAddr.district || shippingAddr.city || '',
              billing_pincode: shippingAddr.pincode || '',
              billing_state: shippingAddr.state || '',
              billing_country: shippingAddr.country || 'India',
              billing_email: customer.email || '',
              billing_phone: customer.phone || '',
              shipping_is_billing: true,
              shipping_customer_name: shippingAddr.name || customer.name || '',
              shipping_last_name: '',
              shipping_address: shippingAddr.address1 || '',
              shipping_address_2: shippingAddr.address2 || '',
              shipping_city: shippingAddr.district || shippingAddr.city || '',
              shipping_pincode: shippingAddr.pincode || '',
              shipping_state: shippingAddr.state || '',
              shipping_country: shippingAddr.country || 'India',
              shipping_email: customer.email || '',
              shipping_phone: customer.phone || shippingAddr.phone || '',
              order_items: items.map((item) => ({
                name: item.name || 'Product',
                sku: item.products?.sku || item.product_id || '',
                units: item.quantity || 1,
                selling_price: (item.unit_amount_cents || 0) / 100
              })),
              payment_method: 'Prepaid',
              sub_total: (order.total_cents || 0) / 100,
              length: 10,
              breadth: 10,
              height: 10,
              weight: 0.5
            });
          }
        } catch (shiprocketError) {
          console.error('Failed to create Shiprocket order:', shiprocketError);
          // Don't fail the webhook if Shiprocket fails
        }
      }
    }
    
    // Handle refund events from Stripe
    if (event.type === 'charge.refunded' || event.type === 'refund.created' || event.type === 'refund.updated') {
      const refund = event.data.object as any;
      console.log(`Refund event received: ${event.type}, refund ID: ${refund.id}`);
      
      const supabase = getSupabaseAdminClient();
      
      // Try to find order by payment intent ID or charge ID
      let orderId: string | null = null;
      
      // Get payment intent ID from refund object
      const paymentIntentId = refund.payment_intent as string | undefined;
      const chargeId = refund.charge as string | undefined;
      
      if (paymentIntentId) {
        // Find order by payment intent ID
        const { data: orderByIntent } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single();
        
        if (orderByIntent) {
          orderId = orderByIntent.id;
        }
      }
      
      if (!orderId && chargeId) {
        // Find order by charge ID
        const { data: orderByCharge } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_charge_id', chargeId)
          .single();
        
        if (orderByCharge) {
          orderId = orderByCharge.id;
        }
      }
      
      if (!orderId && paymentIntentId) {
        // Try to find by searching through checkout sessions
        // This is a fallback - we might need to store charge IDs better
        const { data: orders } = await supabase
          .from('orders')
          .select('id, stripe_payment_intent_id, stripe_charge_id')
          .or(`stripe_payment_intent_id.eq.${paymentIntentId},stripe_charge_id.eq.${chargeId || ''}`)
          .limit(1);
        
        if (orders && orders.length > 0 && orders[0]) {
          orderId = orders[0].id;
        }
      }
      
      if (orderId) {
        console.log(`Found order ${orderId} for refund ${refund.id}`);
        
        // Get refund amount (in cents)
        const refundAmount = refund.amount || 0;
        const refundStatus = refund.status || 'pending';
        
        // Update order with refund information
        const updateData: Record<string, unknown> = {
          payment_status: refundStatus === 'succeeded' || refundStatus === 'paid' ? 'refunded' : 'paid',
          refund_id: refund.id,
          refund_amount_cents: refundAmount,
          refund_amount: refundAmount / 100.0,
          refund_reason: refund.reason || 'requested_by_customer',
          updated_at: new Date().toISOString()
        };
        
        // If full refund, also update order status to cancelled
        const { data: order } = await supabase
          .from('orders')
          .select('paid_amount_cents, status')
          .eq('id', orderId)
          .single();
        
        if (order && refundAmount >= (order.paid_amount_cents || 0)) {
          // Full refund - mark order as cancelled
          updateData.status = 'cancelled';
        }
        
        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);
        
        if (updateError) {
          console.error(`Error updating order ${orderId} with refund info:`, updateError);
        } else {
          console.log(`Successfully updated order ${orderId} with refund ${refund.id}`);
        }
      } else {
        console.warn(`Could not find order for refund ${refund.id}. Payment Intent: ${paymentIntentId}, Charge: ${chargeId}`);
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Stripe webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

