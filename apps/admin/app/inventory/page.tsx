export default function InventoryPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Inventory</h2>
			<div className="rounded-xl border bg-white overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead className="text-left text-muted-foreground">
						<tr>
							<th className="px-4 py-3">SKU</th>
							<th className="px-4 py-3">Product</th>
							<th className="px-4 py-3">Stock</th>
							<th className="px-4 py-3">Reserved</th>
							<th className="px-4 py-3">Actions</th>
						</tr>
					</thead>
					<tbody>
						{[1,2,3].map(i => (
							<tr key={i} className="border-t">
								<td className="px-4 py-3">SKU-{1000+i}</td>
								<td className="px-4 py-3">Product {i}</td>
								<td className="px-4 py-3">50</td>
								<td className="px-4 py-3">5</td>
								<td className="px-4 py-3">
									<button className="rounded-md border px-3 py-1 text-sm">Adjust</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}



