export default function CustomersPage() {
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
						{['Priya','Aman','Ishita'].map((n,i)=>(
							<tr key={n} className="border-t">
								<td className="px-4 py-3">{n}</td>
								<td className="px-4 py-3">{n.toLowerCase()}@example.com</td>
								<td className="px-4 py-3">98xxx {i}23{7+i}</td>
								<td className="px-4 py-3">₹ {(5000 + i*1200).toLocaleString()}</td>
								<td className="px-4 py-3">{3+i}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}



