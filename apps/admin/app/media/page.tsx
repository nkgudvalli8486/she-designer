export default function MediaLibraryPage() {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Media Library</h2>
			<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
				<div className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center text-neutral-400">
					Drag & drop images here or click to upload.
				</div>
				<div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
					{[1,2,3,4].map(i => (
						<div key={i} className="aspect-square rounded-lg border border-neutral-800 bg-neutral-800" />
					))}
				</div>
			</div>
		</div>
	);
}



