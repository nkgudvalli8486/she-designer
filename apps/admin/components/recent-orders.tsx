export function RecentOrders() {
	const rows = [
		{ id: '#ORD‑1024', customer: 'Priya', product: 'Phool (Green)', amount: '₹1,850', status: 'Pending', date: '2025-11-07' },
		{ id: '#ORD‑1023', customer: 'Aman', product: 'Lehenga Set', amount: '₹9,499', status: 'Shipped', date: '2025-11-06' },
		{ id: '#ORD‑1022', customer: 'Ishita', product: 'Saree', amount: '₹3,299', status: 'Delivered', date: '2025-11-06' }
	];
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
						{rows.map((r) => (
							<tr key={r.id} className="border-t border-neutral-800">
								<td className="px-4 py-3 font-medium">{r.id}</td>
								<td className="px-4 py-3">{r.customer}</td>
								<td className="px-4 py-3">{r.product}</td>
								<td className="px-4 py-3">{r.amount}</td>
								<td className="px-4 py-3">
									<span className="rounded-md bg-yellow-400/20 text-yellow-300 px-2 py-0.5 text-xs">{r.status}</span>
								</td>
								<td className="px-4 py-3 text-neutral-400">{r.date}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}


