import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function RecentOrders() {
	const supabase = getSupabaseAdminClient();
	
	// Fetch recent orders with customer and first order item
	const { data: orders } = await supabase
		.from('orders')
		.select(`
			id,
			status,
			total_cents,
			currency,
			created_at,
			customers (
				name
			),
			order_items (
				name,
				quantity
			)
		`)
		.order('created_at', { ascending: false })
		.limit(5);

	const rows = (orders || []).map((order: any) => {
		const customerName = order.customers?.name || 'Guest';
		const firstItem = order.order_items?.[0];
		const productName = firstItem?.name || 'Multiple items';
		const amount = `₹${((order.total_cents || 0) / 100).toLocaleString()}`;
		const status = order.status || 'pending';
		const date = new Date(order.created_at).toLocaleDateString('en-IN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		const shortId = `#${order.id.slice(0, 8).toUpperCase()}`;

		// Status badge colors
		const statusColors: Record<string, string> = {
			pending: 'bg-yellow-400/20 text-yellow-300',
			processing: 'bg-blue-400/20 text-blue-300',
			shipped: 'bg-purple-400/20 text-purple-300',
			delivered: 'bg-green-400/20 text-green-300',
			cancelled: 'bg-red-400/20 text-red-300',
			returned: 'bg-orange-400/20 text-orange-300'
		};

		return {
			id: shortId,
			customer: customerName,
			product: productName,
			amount,
			status: status.charAt(0).toUpperCase() + status.slice(1),
			statusColor: statusColors[status] || 'bg-gray-400/20 text-gray-300',
			date
		};
	});

	return (
		<div className="rounded-xl border border-neutral-800 bg-neutral-900">
			<div className="p-4 border-b border-neutral-800 font-semibold">Recent Orders</div>
			<div className="overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="text-left text-neutral-300">
						<tr>
							<th className="px-4 py-3">Order ID</th>
							<th className="px-4 py-3">Customer</th>
							<th className="px-4 py-3">Product</th>
							<th className="px-4 py-3">Amount</th>
							<th className="px-4 py-3">Status</th>
							<th className="px-4 py-3">Date</th>
						</tr>
					</thead>
					<tbody>
						{rows.length > 0 ? (
							rows.map((r) => (
								<tr key={r.id} className="border-t border-neutral-800">
									<td className="px-4 py-3 font-medium">{r.id}</td>
									<td className="px-4 py-3">{r.customer}</td>
									<td className="px-4 py-3">{r.product}</td>
									<td className="px-4 py-3">{r.amount}</td>
									<td className="px-4 py-3">
										<span className={`rounded-md ${r.statusColor} px-2 py-0.5 text-xs`}>{r.status}</span>
									</td>
									<td className="px-4 py-3 text-neutral-400">{r.date}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={6} className="px-4 py-3 text-center text-neutral-400">
									No orders yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}


