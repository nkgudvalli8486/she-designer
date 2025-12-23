import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import Link from 'next/link';
import { Suspense } from 'react';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

async function OrdersList({ statusFilter, paymentFilter }: { statusFilter?: string; paymentFilter?: string }) {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from('orders')
    .select('id, status, payment_status, total_cents, currency, created_at, customers(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (paymentFilter && paymentFilter !== 'all') {
    query = query.eq('payment_status', paymentFilter);
  }

  const { data: orders } = await query;

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
    <div className="mt-6">
      {(!orders || orders.length === 0) ? (
        <div className="text-neutral-400 text-center py-8">No orders found.</div>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-800 border-b border-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Order ID</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Payment</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const customerName = o.customers?.name || 'Guest';
                const shortId = `#${o.id.slice(0, 8).toUpperCase()}`;
                return (
                  <tr key={o.id} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                    <td className="px-4 py-3 font-medium text-neutral-200">{shortId}</td>
                    <td className="px-4 py-3 text-neutral-200">{customerName}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      {o.currency.toUpperCase()} {(o.total_cents / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs ${statusColors[o.status] || 'bg-gray-100 text-gray-800'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-1 text-xs ${paymentColors[o.payment_status] || 'bg-gray-100 text-gray-800'}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/orders/${o.id}`} className="text-pink-400 hover:text-pink-300 hover:underline text-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function OrdersListPage({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string }> }) {
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const paymentFilter = params.payment || 'all';

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Orders</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <form method="get" className="flex gap-2">
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
          <select
            name="payment"
            defaultValue={paymentFilter}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="all">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
          >
            Filter
          </button>
          {(statusFilter !== 'all' || paymentFilter !== 'all') && (
            <Link
              href="/orders"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <Suspense fallback={<div className="text-muted-foreground">Loading orders...</div>}>
        <OrdersList statusFilter={statusFilter} paymentFilter={paymentFilter} />
      </Suspense>
    </div>
  );
}


