import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthToken } from '@/src/lib/auth';
import Image from 'next/image';

async function fetchOrders() {
  const token = await getAuthToken();
  if (!token) {
    redirect('/login?redirect=/orders');
  }
  
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const base = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_ECOM_BASE_URL || `http://localhost:${process.env.PORT ?? '3000'}`);
  const res = await fetch(`${base}/api/public/orders`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return { data: [] as any[] };
  return res.json();
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

export default async function OrdersPage() {
  const { data: orders } = await fetchOrders();
  const ordersList = (orders as Array<any>) ?? [];

  if (ordersList.length === 0) {
    return (
      <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">My Orders</h1>
          <div className="bg-neutral-800 rounded-lg p-8 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-neutral-400 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">My Orders</h1>
        <div className="space-y-4">
          {ordersList.map((order: any) => {
            const orderItems = (order.order_items || []) as Array<any>;
            const firstItem = orderItems[0];
            const firstProduct = firstItem?.products;
            const productImages = (firstProduct?.product_images || []) as Array<any>;
            const sortedImages = productImages.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
            const firstImage = sortedImages[0]?.image_url || null;
            const itemCount = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-neutral-800 rounded-lg p-4 sm:p-6 hover:bg-neutral-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Order Image */}
                  {firstImage && (
                    <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-neutral-700 flex-shrink-0">
                      <img
                        src={firstImage}
                        alt={firstProduct?.name || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Order Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">
                            Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                          </h3>
                        </div>
                        <p className="text-sm text-neutral-400">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-neutral-400 mb-2">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">
                        ₹{(order.total_cents || 0) / 100}
                      </div>
                      <div className="text-sm text-neutral-400">
                        View Details →
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

