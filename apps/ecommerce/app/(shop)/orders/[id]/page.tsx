import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken, verifyAuthToken } from '@/src/lib/auth';
import { notFound } from 'next/navigation';
import { CancelOrderButton } from '@/components/cancel-order-button';
import { RefundStatusChecker } from '@/components/refund-status-checker';
import { autoSyncRefund } from './sync-refund-action';
import { revalidatePath } from 'next/cache';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

async function fetchOrder(orderId: string) {
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/orders');
  }
  
  const authPayload = await verifyAuthToken(token);
  if (!authPayload?.userId) {
    redirect('/login?redirect=/orders');
  }
  
  // Query order directly from database
  const supabase = getSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (
          *,
          product_images (*)
        )
      )
    `)
    .eq('id', orderId)
    .eq('customer_id', authPayload.userId)
    .single();
  
  if (error || !order) {
    return null;
  }
  
  return order;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    processing: 'bg-blue-500/20 text-blue-500',
    shipped: 'bg-purple-500/20 text-purple-500',
    delivered: 'bg-green-500/20 text-green-500',
    cancelled: 'bg-red-500/20 text-red-500',
    returned: 'bg-orange-500/20 text-orange-500'
  };
  return colors[status] || 'bg-neutral-500/20 text-neutral-500';
}

function getPaymentStatusColor(status: string) {
  const colors: Record<string, string> = {
    unpaid: 'bg-gray-500/20 text-gray-500',
    paid: 'bg-green-500/20 text-green-500',
    refunded: 'bg-red-500/20 text-red-500'
  };
  return colors[status] || 'bg-neutral-500/20 text-neutral-500';
}

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let order = await fetchOrder(id);

  if (!order) {
    notFound();
  }

  // Automatically check for refunds if order is cancelled and payment is still paid
  // This ensures refunds processed in Stripe are reflected in the UI
  if (order.status === 'cancelled' && order.payment_status === 'paid' && order.paid_amount_cents > 0) {
    try {
      console.log(`Auto-checking refunds for order ${id}`);
      const syncResult = await autoSyncRefund(id);
      console.log('Refund sync result:', syncResult);
      if (syncResult.success && syncResult.synced && syncResult.refunded) {
        // Refund was found and order was updated - revalidate and refetch
        revalidatePath(`/orders/${id}`);
        order = await fetchOrder(id);
        console.log('Order updated with refund, payment_status:', order?.payment_status);
      }
    } catch (error) {
      // Log error but don't break the page
      console.error('Error checking refund status:', error);
    }
  }

  const orderItems = (order.order_items || []) as Array<any>;
  const shippingAddress = (order.shipping_address || {}) as any;

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-200 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>

        <div className="bg-neutral-800 rounded-lg p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
              </h1>
              <p className="text-neutral-400">
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                {order.payment_status}
              </span>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {orderItems.map((item: any) => {
                const product = item.products || {};
                const productImages = (product.product_images || []) as Array<any>;
                const sortedImages = productImages.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                const firstImage = sortedImages[0]?.image_url || null;

                return (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-neutral-700 last:border-0">
                    {firstImage && (
                      <Link
                        href={`/products/${product.slug}`}
                        className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-700 flex-shrink-0"
                      >
                        <img
                          src={firstImage}
                          alt={item.name || 'Product'}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${product.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {item.name || 'Product'}
                      </Link>
                      <div className="text-sm text-neutral-400 mt-1">
                        Quantity: {item.quantity || 1}
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        ₹{((item.unit_amount_cents || 0) * (item.quantity || 1)) / 100}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
              <div className="bg-neutral-700/50 rounded-lg p-4">
                <p className="font-medium">{shippingAddress.name}</p>
                {shippingAddress.phone && <p className="text-neutral-400">{shippingAddress.phone}</p>}
                <p className="text-neutral-300 mt-2">
                  {shippingAddress.address1}
                  {shippingAddress.address2 && `, ${shippingAddress.address2}`}
                </p>
                <p className="text-neutral-300">
                  {shippingAddress.district || shippingAddress.city}
                  {shippingAddress.state && `, ${shippingAddress.state}`}
                  {shippingAddress.pincode && ` - ${shippingAddress.pincode}`}
                </p>
                {shippingAddress.country && (
                  <p className="text-neutral-300">{shippingAddress.country}</p>
                )}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t border-neutral-700 pt-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total</span>
              <span>₹{(order.total_cents || 0) / 100}</span>
            </div>
            
            {/* Refund Information */}
            {order.payment_status === 'refunded' && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-green-500">Refund Processed</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {order.refund_amount_cents && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Refunded Amount:</span>
                      <span className="font-semibold text-green-500">₹{(order.refund_amount_cents || 0) / 100}</span>
                    </div>
                  )}
                  {order.refund_id && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Refund ID:</span>
                      <span className="font-mono text-xs text-neutral-300">{order.refund_id}</span>
                    </div>
                  )}
                  {order.refund_reason && (
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Reason:</span>
                      <span className="text-neutral-300 capitalize">{order.refund_reason.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-neutral-400">
                    Refund will be credited to your original payment method within 5-10 business days.
                  </div>
                </div>
              </div>
            )}
            
            {/* Pending Refund (if order cancelled but refund not processed yet) */}
            {order.status === 'cancelled' && order.payment_status === 'paid' && order.paid_amount_cents > 0 && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-yellow-500">Refund Pending</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Amount to Refund:</span>
                    <span className="font-semibold text-yellow-500">₹{(order.paid_amount_cents || 0) / 100}</span>
                  </div>
                  <div className="mt-2 text-xs text-neutral-400">
                    When a refund is processed in Stripe, the order status will update automatically. Please refresh the page to see the latest status.
                  </div>
                  <RefundStatusChecker
                    orderId={order.id}
                    orderStatus={order.status}
                    paymentStatus={order.payment_status}
                    paidAmountCents={order.paid_amount_cents || 0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cancel Order Button */}
          <CancelOrderButton
            orderId={order.id}
            orderStatus={order.status}
            paymentStatus={order.payment_status}
          />
        </div>

        <div className="flex gap-4">
          <Link
            href="/orders"
            className="flex-1 text-center px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
          >
            Back to Orders
          </Link>
          <Link
            href="/"
            className="flex-1 text-center px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

