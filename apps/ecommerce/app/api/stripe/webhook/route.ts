import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhook, createShiprocketOrder, getChargeIdFromPaymentIntent } from '@nts/integrations';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature') || '';
  const raw = await req.text();
  try {
    console.log('Stripe webhook received');
    const event = verifyStripeWebhook({ payload: raw, signature });
    console.log('Stripe webhook event type:', event.type);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderId = session?.metadata?.orderId as string | undefined;
      console.log('Checkout session completed, orderId:', orderId);
      
      if (orderId) {
        const supabase = getSupabaseAdminClient();
        
        // Fetch order to get customer_id and order items for cart clearing
        const { data: orderForCart, error: orderFetchError } = await supabase
          .from('orders')
          .select('customer_id, order_items(product_id), payment_status')
          .eq('id', orderId)
          .single();
        
        if (orderFetchError) {
          console.error('Error fetching order for cart clearing:', orderFetchError);
        }
        
        if (!orderForCart) {
          console.error(`Order ${orderId} not found`);
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
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
        
        // Check if already processed
        if (orderForCart.payment_status === 'paid') {
          console.log(`Order ${orderId} already marked as paid, but updating payment info for refund tracking`);
          
          // Order is already paid, but update payment info for refund tracking
          const paymentInfoUpdate: Record<string, unknown> = {
            stripe_session_id: session.id
          };
          
          if (paymentIntentId) {
            paymentInfoUpdate.stripe_payment_intent_id = paymentIntentId;
          }
          if (chargeId) {
            paymentInfoUpdate.stripe_charge_id = chargeId;
          }
          
          const { error: paymentInfoError } = await supabase
            .from('orders')
            .update(paymentInfoUpdate)
            .eq('id', orderId);
          
          if (paymentInfoError) {
            console.error('Error updating payment info:', paymentInfoError);
          } else {
            console.log(`Successfully updated payment info for order ${orderId}`);
          }
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
            
            // Deduct stock for confirmed order (payment successful)
            try {
              const { deductStockForOrder } = await import('@/src/lib/stock');
              
              // Skip if we already deducted stock for this order
              const { data: orderMetaRow } = await supabase
                .from('orders')
                .select('metadata')
                .eq('id', orderId)
                .single();
              const existingMeta = (orderMetaRow as any)?.metadata && typeof (orderMetaRow as any).metadata === 'object' ? (orderMetaRow as any).metadata : {};
              if (existingMeta?.stock_deducted === true) {
                console.log(`Stock already deducted for order ${orderId}, skipping.`);
              } else {
              // Fetch order items to get product IDs and quantities
              const { data: orderItems } = await supabase
                .from('order_items')
                .select('product_id, quantity')
                .eq('order_id', orderId);
              
              if (orderItems && orderItems.length > 0) {
                await deductStockForOrder(
                  orderItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                  }))
                );
                console.log(`Successfully deducted stock for order ${orderId}`);
                // Mark as deducted to prevent double-deduction (e.g., success-page verification + webhook)
                await supabase
                  .from('orders')
                  .update({
                    metadata: {
                      ...existingMeta,
                      stock_deducted: true
                    }
                  })
                  .eq('id', orderId);
              }
              }
            } catch (stockError: any) {
              // Log error but don't fail the webhook (order is already confirmed)
              // In production, you might want to implement a retry mechanism or alert
              console.error(`Failed to deduct stock for order ${orderId}:`, stockError);
            }
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
            const customer = (order as any).customers;
            const orderItems = ((order as any).order_items || []).map((item: any) => ({
              name: item.name,
              sku: item.products?.sku || `prod_${item.product_id}`,
              units: item.quantity,
              selling_price: item.unit_amount_cents
            }));

            // Only create Shiprocket order if we have shipping address and items
            if (shippingAddr && orderItems.length > 0) {
              await createShiprocketOrder({
                order_id: orderId,
                order_date: new Date().toISOString(),
                billing_customer_name: shippingAddr.name || customer?.name || 'Customer',
                billing_city: shippingAddr.district || shippingAddr.city || '',
                billing_state: shippingAddr.state || '',
                billing_pincode: shippingAddr.pincode || shippingAddr.postal_code || '',
                billing_country: shippingAddr.country || 'India',
                billing_email: customer?.email || shippingAddr.email || '',
                billing_phone: shippingAddr.phone || customer?.phone || '',
                order_items: orderItems,
                payment_method: 'Prepaid',
                shipping_is_billing: true
              });
            } else {
              console.warn(`Skipping Shiprocket order creation for ${orderId}: missing shipping address or order items`);
            }
          } else {
            console.warn(`Order ${orderId} not found when creating Shiprocket order`);
          }
        } catch (err) {
          // Log error but don't fail the webhook
          console.error('Shiprocket order creation failed:', err);
        }
      }
    }
    
    // Handle refund events from Stripe
    if (event.type === 'charge.refunded' || event.type === 'refund.created' || event.type === 'refund.updated') {
      const refund = event.data.object as any;
      console.log(`Refund event received: ${event.type}, refund ID: ${refund.id}`);
      console.log('Refund object:', JSON.stringify(refund, null, 2));
      
      const supabase = getSupabaseAdminClient();
      
      // Try to find order by payment intent ID or charge ID
      let orderId: string | null = null;
      
      // Get payment intent ID from refund object
      const paymentIntentId = refund.payment_intent as string | undefined;
      const chargeId = refund.charge as string | undefined;
      
      console.log(`Looking for order with Payment Intent: ${paymentIntentId}, Charge: ${chargeId}`);
      
      if (paymentIntentId) {
        // Find order by payment intent ID
        const { data: orderByIntent, error: intentError } = await supabase
          .from('orders')
          .select('id, stripe_payment_intent_id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .single();
        
        if (intentError) {
          console.log('Error finding by payment intent:', intentError);
        }
        
        if (orderByIntent) {
          orderId = orderByIntent.id;
          console.log(`Found order ${orderId} by payment intent ID`);
        }
      }
      
      if (!orderId && chargeId) {
        // Find order by charge ID
        const { data: orderByCharge, error: chargeError } = await supabase
          .from('orders')
          .select('id, stripe_charge_id')
          .eq('stripe_charge_id', chargeId)
          .single();
        
        if (chargeError) {
          console.log('Error finding by charge ID:', chargeError);
        }
        
        if (orderByCharge) {
          orderId = orderByCharge.id;
          console.log(`Found order ${orderId} by charge ID`);
        }
      }
      
      // Fallback: search all orders with payment info
      if (!orderId) {
        const { data: allOrders } = await supabase
          .from('orders')
          .select('id, stripe_payment_intent_id, stripe_charge_id, stripe_session_id')
          .not('stripe_payment_intent_id', 'is', null)
          .limit(100);
        
        if (allOrders) {
          const matchingOrder = allOrders.find(o => 
            o.stripe_payment_intent_id === paymentIntentId || 
            o.stripe_charge_id === chargeId
          );
          if (matchingOrder) {
            orderId = matchingOrder.id;
            console.log(`Found order ${orderId} by fallback search`);
          }
        }
      }
      
      if (orderId) {
        console.log(`Found order ${orderId} for refund ${refund.id}`);
        
        // Get refund amount (in cents)
        const refundAmount = refund.amount || 0;
        const refundStatus = refund.status || 'pending';
        
        console.log(`Refund details: amount=${refundAmount}, status=${refundStatus}`);
        
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
          console.log(`Full refund detected, marking order as cancelled`);
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
        console.warn('Order may not have been created through this system, or payment details are missing');
      }
    }
    
    return NextResponse.json({ received: true, type: event.type });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 400 });
  }
}


