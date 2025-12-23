import { AnalyticsCharts } from '@/components/analytics-charts';

export default async function AnalyticsPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold text-neutral-200">Analytics Dashboard</h2>
			<AnalyticsCharts />
		</div>
	);
}



