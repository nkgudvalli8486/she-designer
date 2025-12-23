import Link from 'next/link';
import { getAdminBaseUrl } from '@/src/lib/base-url';
import { AddProductForm } from '@/components/products/add-product-form';

type Category = { id: string; name: string; slug: string; image_url?: string | null };

async function fetchCategories(): Promise<Category[]> {
	const base = getAdminBaseUrl();
	const res = await fetch(`${base}/api/categories`, { cache: 'no-store' }).catch(() => null);
	if (!res?.ok) return [];
	const json = await res.json().catch(() => ({}));
	return json.data ?? [];
}

export default async function AddProductPage() {
	const categories = await fetchCategories();
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Link href="/products" className="hover:underline">Back to Products</Link>
				<span>•</span>
				<span className="text-foreground font-medium">Add New Product</span>
			</div>

			<div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
				<h2 className="text-lg font-semibold mb-4">Basic Information</h2>
				<AddProductForm categories={categories} />
			</div>
		</div>
	);
}

