export default function SettingsPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Settings</h2>
			<div className="grid gap-6 md:grid-cols-2">
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
					<h3 className="font-semibold">Store Info</h3>
					<input className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Store Name" />
					<input className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Support Email" />
					<input className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Support Phone" />
					<button className="px-4 py-2 rounded-md bg-pink-600 text-white">Save</button>
				</div>
				<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-3">
					<h3 className="font-semibold">Integrations</h3>
					<input className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Stripe Secret Key" />
					<input className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Shiprocket API Key" />
					<button className="px-4 py-2 rounded-md bg-pink-600 text-white">Save</button>
				</div>
			</div>
		</div>
	);
}



