import { ReactNode } from 'react';

export function StatCard(props: { icon: ReactNode; label: string; value: string; delta?: string }) {
	return (
		<div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900">
			<div className="flex items-center justify-between">
				<div className="text-sm text-neutral-400">{props.label}</div>
				<div className="h-9 w-9 rounded-lg bg-neutral-800 flex items-center justify-center">{props.icon}</div>
			</div>
			<div className="mt-3 text-3xl font-semibold">{props.value}</div>
			{props.delta ? <div className="mt-2 text-xs text-emerald-600">↑ {props.delta} from last month</div> : null}
		</div>
	);
}


