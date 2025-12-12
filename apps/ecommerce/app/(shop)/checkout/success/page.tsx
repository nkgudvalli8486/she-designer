import { headers } from 'next/headers';
import Link from 'next/link';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { redirect } from 'next/navigation';
import { retrieveCheckoutSession } from '@nts/integrations';
import { Suspense } from 'react';
import { VerifyPayment } from './verify-payment';

export default async function CheckoutSuccessPage(props: { searchParams: Promise<{ session_id?: string }> }) {
  const token = await getAuthToken();
  const authPayload = token ? await verifyAuthToken(token) : null;
  
  if (!authPayload?.userId) {
    redirect('/login?redirect=/checkout/success');
  }

  const searchParams = await props.searchParams;
  const sessionId = searchParams?.session_id; // Stripe redirects with session_id

  // Fetch the most recent order for this customer
  const supabase = getSupabaseServerClient();
  let { data: recentOrder } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_cents,
      currency,
      status,
      payment_status,
      created_at,
      order_items (
        name,
        quantity,
        unit_amount_cents
      )
    `)
    .eq('customer_id', authPayload.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Skip all processing if order is already paid (prevent unnecessary work)
  if (recentOrder && recentOrder.payment_status === 'paid') {
    // Just ensure cart is cleared (should already be, but double-check)
    const supabaseAdmin = getSupabaseAdminClient();
    await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('customer_id', authPayload.userId);
  } else if (recentOrder && recentOrder.payment_status === 'unpaid') {
    // Verify payment with Stripe if we have a session_id
    let paymentVerified = false;
    let verifiedOrderId: string | null = null;
    
    if (sessionId) {
      try {
        const session = await retrieveCheckoutSession(sessionId);
        verifiedOrderId = session.metadata?.orderId as string | undefined || null;
        paymentVerified = session.payment_status === 'paid' || session.status === 'complete';
        
        console.log(`Stripe session verified: payment_status=${session.payment_status}, orderId=${verifiedOrderId}`);
      } catch (error) {
        console.error('Error retrieving Stripe session:', error);
      }
    }

    // Update order and clear cart if:
    // 1. We have a verified Stripe session showing payment is complete, OR
    // 2. Order is unpaid and was created recently (within last 15 minutes) - fallback for webhook delays
    const shouldUpdate = (paymentVerified && verifiedOrderId === recentOrder.id) || 
      (!sessionId && (Date.now() - new Date(recentOrder.created_at).getTime() < 15 * 60 * 1000));

    if (shouldUpdate) {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Get payment amount from Stripe session if available
    let paidAmount = recentOrder.total_cents;
    if (sessionId && paymentVerified) {
      try {
        const session = await retrieveCheckoutSession(sessionId);
        paidAmount = session.amount_total || recentOrder.total_cents;
      } catch (error) {
        console.error('Error getting payment amount from session:', error);
      }
    }
    
    console.log(`Updating order ${recentOrder.id} to paid (verified: ${paymentVerified}, paidAmount: ${paidAmount})`);
    
    // Update order to paid
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'processing',
        paid_amount_cents: paidAmount,
        paid_amount: paidAmount / 100.0
      })
      .eq('id', recentOrder.id);
    
    if (updateError) {
      console.error('Error updating order:', updateError);
    } else {
      console.log(`Successfully updated order ${recentOrder.id} to paid`);
    }
    
    // Clear cart - ALWAYS clear if we're on success page
    console.log(`Clearing cart for customer ${authPayload.userId}`);
    const { error: cartError, data: deletedItems } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('customer_id', authPayload.userId)
      .select();
    
    if (cartError) {
      console.error('Error clearing cart:', cartError);
    } else {
      console.log(`Cleared ${deletedItems?.length || 0} cart items for customer ${authPayload.userId}`);
    }
    
    // Refetch the order
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_cents,
        currency,
        status,
        payment_status,
        created_at,
        order_items (
          name,
          quantity,
          unit_amount_cents
        )
      `)
      .eq('id', recentOrder.id)
      .single();
    
      if (updatedOrder) {
        recentOrder = updatedOrder;
      }
    } else {
      // Order is unpaid but we can't verify - still clear cart (user completed checkout)
      const supabaseAdmin = getSupabaseAdminClient();
      console.log(`Clearing cart for customer ${authPayload.userId} (unpaid order on success page)`);
      await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('customer_id', authPayload.userId);
    }
  }

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      {/* Client-side verification as backup (runs once, no reload) */}
      <Suspense fallback={null}>
        <VerifyPayment orderId={recentOrder?.id} sessionId={sessionId} />
      </Suspense>
      <div className="max-w-2xl mx-auto">
        <div className="bg-neutral-800 rounded-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-neutral-400">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>
          </div>

          {recentOrder && (
            <div className="border-t border-neutral-700 pt-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Order Number:</span>
                  <span className="font-medium">{recentOrder.order_number || recentOrder.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total:</span>
                  <span className="font-medium">
                    ₹{(recentOrder.total_cents || 0) / 100}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span className="font-medium capitalize">{recentOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment:</span>
                  <span className="font-medium capitalize text-green-500">{recentOrder.payment_status}</span>
                </div>
              </div>

              {recentOrder.order_items && recentOrder.order_items.length > 0 && (
                <div className="mt-6 pt-6 border-t border-neutral-700">
                  <h3 className="text-md font-semibold mb-3">Items Ordered</h3>
                  <ul className="space-y-2">
                    {(recentOrder.order_items as Array<any>).map((item: any, idx: number) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span>₹{((item.unit_amount_cents || 0) * (item.quantity || 1)) / 100}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 text-center px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
            >
              Continue Shopping
            </Link>
            {recentOrder && (
              <Link
                href={`/orders/${recentOrder.id}`}
                className="flex-1 text-center px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                View Order
              </Link>
            )}
            <Link
              href="/orders"
              className="flex-1 text-center px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
            >
              All Orders
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-700">
            <p className="text-sm text-neutral-400 text-center">
              You will receive an email confirmation shortly with your order details and tracking information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

