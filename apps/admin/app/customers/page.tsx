import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export default async function CustomersPage() {
	const supabase = getSupabaseAdminClient();
	
	// Fetch customers with their order statistics
	const { data: customers } = await supabase
		.from('customers')
		.select(`
			id,
			name,
			email,
			phone,
			orders (
				id,
				total_cents,
				payment_status
			)
		`)
		.order('created_at', { ascending: false })
		.limit(100);

	// Calculate total spend and order count for each customer
	const customersWithStats = (customers || []).map((customer: any) => {
		const orders = customer.orders || [];
		const totalSpend = orders
			.filter((o: any) => o.payment_status === 'paid')
			.reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0);
		const orderCount = orders.length;
		
		return {
			id: customer.id,
			name: customer.name || 'Unknown',
			email: customer.email || '-',
			phone: customer.phone || '-',
			totalSpend,
			orderCount
		};
	});

	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Customers</h2>
			<div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="text-left text-neutral-300 border-b border-neutral-800">
						<tr>
							<th className="px-4 py-3 font-semibold">Name</th>
							<th className="px-4 py-3 font-semibold">Email</th>
							<th className="px-4 py-3 font-semibold">Phone</th>
							<th className="px-4 py-3 font-semibold">Total Spend</th>
							<th className="px-4 py-3 font-semibold">Orders</th>
						</tr>
					</thead>
					<tbody>
						{customersWithStats.length > 0 ? (
							customersWithStats.map((customer) => (
								<tr key={customer.id} className="border-t border-neutral-800 hover:bg-neutral-800/50">
									<td className="px-4 py-3 text-neutral-200">{customer.name}</td>
									<td className="px-4 py-3 text-neutral-200">{customer.email}</td>
									<td className="px-4 py-3 text-neutral-200">{customer.phone}</td>
									<td className="px-4 py-3 text-neutral-200">₹ {(customer.totalSpend / 100).toLocaleString()}</td>
									<td className="px-4 py-3 text-neutral-200">{customer.orderCount}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
									No customers yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}



