import { getSupabaseServerClient } from '@/src/lib/supabase-server';

export default async function OrdersListPage() {
  const supabase = getSupabaseServerClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, payment_status, total_cents, currency, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="mt-6 grid gap-3">
        {(orders ?? []).map((o) => (
          <div key={o.id} className="rounded-lg border p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{o.id}</div>
              <div className="text-sm">
                {new Date(o.created_at as string).toLocaleString()} • {o.currency.toUpperCase()}{' '}
                {(o.total_cents / 100).toFixed(0)}
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded bg-muted px-2 py-1 text-xs">{o.status}</span>
              <span className="rounded bg-muted px-2 py-1 text-xs">{o.payment_status}</span>
            </div>
          </div>
        ))}
        {(!orders || orders.length === 0) && (
          <div className="text-muted-foreground">No orders yet.</div>
        )}
      </div>
    </div>
  );
}


