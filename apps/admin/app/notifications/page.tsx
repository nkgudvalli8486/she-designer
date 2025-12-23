import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import Link from 'next/link';
import { Bell, ShoppingCart, Clock } from 'lucide-react';
import { NotificationClear } from '@/components/notification-clear';

export default async function NotificationsPage() {
  const supabase = getSupabaseAdminClient();
  
  // Get recent orders (last 7 days) as notifications
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      payment_status,
      total_cents,
      currency,
      created_at,
      customers (
        name,
        email
      )
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);
  
  const notifications = (orders || []).map((order: any) => ({
    id: order.id,
    type: 'new_order',
    title: 'New Order',
    message: `New order from ${order.customers?.name || 'Guest'}`,
    amount: order.total_cents,
    currency: order.currency,
    status: order.status,
    payment_status: order.payment_status,
    createdAt: order.created_at,
    customerName: order.customers?.name || 'Guest',
    customerEmail: order.customers?.email || null
  }));
  
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
    processing: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
    shipped: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
    delivered: 'bg-green-400/20 text-green-300 border-green-400/30',
    cancelled: 'bg-red-400/20 text-red-300 border-red-400/30',
    returned: 'bg-orange-400/20 text-orange-300 border-orange-400/30'
  };
  
  const paymentColors: Record<string, string> = {
    unpaid: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    paid: 'bg-green-400/20 text-green-300 border-green-400/30',
    refunded: 'bg-red-400/20 text-red-300 border-red-400/30'
  };
  
  return (
    <div className="space-y-6">
      <NotificationClear />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-pink-400" />
          <h2 className="text-2xl font-semibold">Notifications</h2>
        </div>
        <div className="text-sm text-neutral-400">
          {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
          <Bell className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400 text-lg">No new notifications</p>
          <p className="text-neutral-500 text-sm mt-2">You'll see new order notifications here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const timeAgo = getTimeAgo(new Date(notification.createdAt));
            return (
              <Link
                key={notification.id}
                href={`/orders/${notification.id}`}
                className="block rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 p-2 rounded-lg bg-pink-500/20">
                      <ShoppingCart className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-200">{notification.title}</h3>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs border ${statusColors[notification.status] || 'bg-gray-400/20 text-gray-300'}`}>
                          {notification.status}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs border ${paymentColors[notification.payment_status] || 'bg-gray-400/20 text-gray-300'}`}>
                          {notification.payment_status}
                        </span>
                        <span className="text-sm text-neutral-400">
                          {notification.currency.toUpperCase()} {(notification.amount / 100).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}

