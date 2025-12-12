import { getSupabaseServerClient } from '@/src/lib/supabase-server';

export default async function CustomersPage() {
	const supabase = getSupabaseServerClient();
	
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
			<div className="rounded-xl border bg-white overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="text-left text-muted-foreground">
						<tr>
							<th className="px-4 py-3">Name</th>
							<th className="px-4 py-3">Email</th>
							<th className="px-4 py-3">Phone</th>
							<th className="px-4 py-3">Total Spend</th>
							<th className="px-4 py-3">Orders</th>
						</tr>
					</thead>
					<tbody>
						{customersWithStats.length > 0 ? (
							customersWithStats.map((customer) => (
								<tr key={customer.id} className="border-t">
									<td className="px-4 py-3">{customer.name}</td>
									<td className="px-4 py-3">{customer.email}</td>
									<td className="px-4 py-3">{customer.phone}</td>
									<td className="px-4 py-3">₹ {(customer.totalSpend / 100).toLocaleString()}</td>
									<td className="px-4 py-3">{customer.orderCount}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
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



