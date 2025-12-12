import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CancelOrderButtonAdmin } from '@/components/cancel-order-button-admin';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone
      ),
      order_items (
        id,
        name,
        unit_amount_cents,
        quantity,
        product_id,
        products (
          id,
          name,
          slug,
          sku
        )
      )
    `)
    .eq('id', id)
    .single();

  if (!order) {
    notFound();
  }

  const shippingAddress = order.shipping_address as any;
  const customer = (order as any).customers;
  const orderItems = (order as any).order_items || [];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    returned: 'bg-orange-100 text-orange-800'
  };

  const paymentColors: Record<string, string> = {
    unpaid: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-red-100 text-red-800'
  };

  return (
    <div className="container py-10">
      <div className="mb-6">
        <Link href="/orders" className="text-blue-600 hover:underline text-sm">
          ← Back to Orders
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Order #{id.slice(0, 8).toUpperCase()}</h1>
        <div className="flex gap-2">
          <span className={`rounded px-3 py-1 text-sm ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
            {order.status}
          </span>
          <span className={`rounded px-3 py-1 text-sm ${paymentColors[order.payment_status] || 'bg-gray-100 text-gray-800'}`}>
            {order.payment_status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Details */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-mono">{id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(order.created_at).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">
                {order.currency.toUpperCase()} {(order.total_cents / 100).toLocaleString()}
              </span>
            </div>
            {order.paid_amount_cents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid Amount:</span>
                <span className="font-semibold text-green-600">
                  {order.currency.toUpperCase()} {(order.paid_amount_cents / 100).toLocaleString()}
                </span>
              </div>
            )}
            {order.refund_amount_cents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refunded Amount:</span>
                <span className="font-semibold text-red-600">
                  {order.currency.toUpperCase()} {(order.refund_amount_cents / 100).toLocaleString()}
                </span>
              </div>
            )}
            {order.refund_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund ID:</span>
                <span className="text-xs font-mono">{order.refund_id}</span>
              </div>
            )}
            {order.refund_reason && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Reason:</span>
                <span className="text-xs capitalize">{order.refund_reason.replace(/_/g, ' ')}</span>
              </div>
            )}
            {order.metadata && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metadata:</span>
                <span className="text-xs font-mono">{JSON.stringify(order.metadata)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details */}
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Customer</h2>
          {customer ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name: </span>
                <span>{customer.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span>{customer.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone: </span>
                <span>{customer.phone || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Guest customer</div>
          )}
        </div>

        {/* Shipping Address */}
        {shippingAddress && (
          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
            <div className="text-sm space-y-1">
              <div>{shippingAddress.name}</div>
              <div>{shippingAddress.address1}</div>
              {shippingAddress.address2 && <div>{shippingAddress.address2}</div>}
              <div>
                {shippingAddress.area}, {shippingAddress.district || shippingAddress.city}
              </div>
              <div>
                {shippingAddress.state} - {shippingAddress.pincode || shippingAddress.postal_code}
              </div>
              <div>{shippingAddress.country}</div>
              {shippingAddress.phone && <div className="mt-2">Phone: {shippingAddress.phone}</div>}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="rounded-xl border bg-white p-6 md:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          {orderItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-left">SKU</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item: any) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2">
                        {item.products ? (
                          <Link href={`/products/${item.products.id}`} className="text-blue-600 hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {item.products?.sku || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">
                        ₹{(item.unit_amount_cents / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        ₹{((item.unit_amount_cents * item.quantity) / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-semibold">Total:</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {order.currency.toUpperCase()} {(order.total_cents / 100).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No items found.</div>
          )}
        </div>
        
        {/* Refund Information */}
        {(order.payment_status === 'refunded' || (order.status === 'cancelled' && order.paid_amount_cents > 0)) && (
          <div className="rounded-xl border bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Refund Information</h2>
            {order.payment_status === 'refunded' ? (
              <div className="space-y-2 text-sm">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-green-600">Refund Processed</span>
                  </div>
                  {order.refund_amount_cents && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refunded Amount:</span>
                      <span className="font-semibold text-green-600">
                        {order.currency.toUpperCase()} {(order.refund_amount_cents / 100).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.refund_id && (
                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">Refund ID:</span>
                      <span className="font-mono text-xs">{order.refund_id}</span>
                    </div>
                  )}
                  {order.refund_reason && (
                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="capitalize">{order.refund_reason.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-yellow-600">Refund Pending</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount to Refund:</span>
                  <span className="font-semibold text-yellow-600">
                    {order.currency.toUpperCase()} {(order.paid_amount_cents / 100).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Order is cancelled but refund needs to be processed manually.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Order Button (Admin) */}
      <div className="mt-6">
        <CancelOrderButtonAdmin orderId={order.id} orderStatus={order.status} />
      </div>
    </div>
  );
}

