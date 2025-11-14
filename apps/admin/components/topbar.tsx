'use client';

import Link from 'next/link';
import { Globe, Plus } from 'lucide-react';

export function Topbar() {
	return (
		<div className="h-16 border-b border-neutral-800 bg-neutral-900/80 text-neutral-200 backdrop-blur sticky top-0 z-40">
			<div className="h-full container flex items-center justify-between">
				<h1 className="text-xl font-semibold">She Designer Admin</h1>
				<div className="flex items-center gap-3">
					<Link
						href="/"
						className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 hover:text-white"
						target="_blank"
					>
						<Globe className="h-4 w-4" />
						<span>View Website</span>
					</Link>
					<Link
						href="/products/add"
						className="inline-flex items-center gap-2 rounded-md bg-pink-600 text-white px-3 py-2 text-sm hover:bg-pink-700"
					>
						<Plus className="h-4 w-4" />
						<span>Add Product</span>
					</Link>
				</div>
			</div>
		</div>
	);
}


