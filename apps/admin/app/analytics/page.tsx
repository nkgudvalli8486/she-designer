import { getSupabaseServerClient } from '@/src/lib/supabase-server';

export default async function AnalyticsPage() {
	const supabase = getSupabaseServerClient();
	
	// Fetch sales data for last 30 days
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	
	const { data: recentOrders } = await supabase
		.from('orders')
		.select('total_cents, created_at, payment_status')
		.gte('created_at', thirtyDaysAgo.toISOString())
		.eq('payment_status', 'paid')
		.order('created_at', { ascending: true });

	// Group sales by date
	const salesByDate: Record<string, number> = {};
	(recentOrders || []).forEach((order: any) => {
		const date = new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
		salesByDate[date] = (salesByDate[date] || 0) + (order.total_cents || 0);
	});

	const salesData = Object.entries(salesByDate).map(([date, amount]) => ({
		date,
		amount: amount / 100
	}));

	const maxAmount = Math.max(...salesData.map(d => d.amount), 1);

	// Fetch top products by order count
	const { data: topProducts } = await supabase
		.from('order_items')
		.select('name, quantity, order_id, orders!inner(payment_status)')
		.eq('orders.payment_status', 'paid')
		.limit(100);

	// Aggregate product orders
	const productCounts: Record<string, number> = {};
	(topProducts || []).forEach((item: any) => {
		productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
	});

	const topProductsList = Object.entries(productCounts)
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Analytics</h2>
			<div className="grid gap-6 md:grid-cols-2">
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 min-h-64">
					<div className="font-semibold mb-4">Sales (Last 30 days)</div>
					{salesData.length > 0 ? (
						<div className="space-y-2">
							<div className="flex items-end gap-1 h-48">
								{salesData.map((data, idx) => {
									const height = (data.amount / maxAmount) * 100;
									return (
										<div key={idx} className="flex-1 flex flex-col items-center gap-1">
											<div className="w-full bg-pink-600 rounded-t flex items-end justify-center" style={{ height: `${height}%`, minHeight: '4px' }}>
												<span className="text-xs text-white/80 mb-1">{data.amount > 0 ? `₹${Math.round(data.amount / 1000)}k` : ''}</span>
											</div>
											<span className="text-xs text-neutral-400 rotate-45 origin-left whitespace-nowrap">{data.date}</span>
										</div>
									);
								})}
							</div>
							<div className="text-xs text-neutral-400 mt-2">
								Total: ₹{salesData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
							</div>
						</div>
					) : (
						<div className="text-sm text-neutral-400">No sales data available for the last 30 days.</div>
					)}
				</div>
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 min-h-64">
					<div className="font-semibold mb-4">Top Products</div>
					{topProductsList.length > 0 ? (
						<ul className="space-y-2">
							{topProductsList.map((product, idx) => (
								<li key={idx} className="flex items-center justify-between text-sm">
									<span className="text-neutral-300">{product.name}</span>
									<span className="text-neutral-400">{product.count} {product.count === 1 ? 'order' : 'orders'}</span>
								</li>
							))}
						</ul>
					) : (
						<div className="text-sm text-neutral-400">No product data available.</div>
					)}
				</div>
			</div>
		</div>
	);
}



