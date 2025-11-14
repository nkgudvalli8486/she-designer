export default function AnalyticsPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Analytics</h2>
			<div className="grid gap-6 md:grid-cols-2">
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 min-h-64">
					<div className="font-semibold mb-2">Sales (Last 30 days)</div>
					<div className="text-sm text-neutral-400">Chart placeholder</div>
				</div>
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 min-h-64">
					<div className="font-semibold mb-2">Top Products</div>
					<ul className="list-disc list-inside text-sm space-y-1 text-neutral-400">
						<li>Lehenga Set – 124 orders</li>
						<li>Silk Saree – 98 orders</li>
						<li>Kurta Dress – 76 orders</li>
					</ul>
				</div>
			</div>
		</div>
	);
}



