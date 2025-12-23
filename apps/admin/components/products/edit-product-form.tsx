'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nts/ui';
import { useToast } from '@/components/toast';
import { getAdminBaseUrl } from '@/src/lib/base-url';

type Category = { id: string; name: string; slug: string; image_url?: string | null };

type Product = {
	id: string;
	name?: string;
	slug?: string;
	description?: string;
	category?: { id: string; name: string };
	price_cents?: number;
	sale_price_cents?: number | null;
	stock?: number;
	images?: Array<{ url?: string; image_url?: string }>;
};

export function EditProductForm({ product, categories }: { product: Product; categories: Category[] }) {
	const router = useRouter();
	const { success, error } = useToast();
	const [isPending, startTransition] = useTransition();

	const base = getAdminBaseUrl();

	const updateProduct = async (formData: FormData) => {
		const payload = {
			name: String(formData.get('name') || ''),
			slug: String(formData.get('slug') || ''),
			description: String(formData.get('description') || ''),
			categoryId: String(formData.get('categoryId') || '') || undefined,
			priceCents: Math.round(Number(formData.get('price') || '0') * 100),
			salePriceCents: String(formData.get('salePrice') || '') ? Math.round(Number(formData.get('salePrice') || '0') * 100) : null,
			stock: Number(formData.get('stock') || '0')
		};

		startTransition(async () => {
			try {
				const res = await fetch(`${base}/api/products/${product.id}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) throw new Error(await res.text());
				success('Product updated');
				router.refresh();
			} catch (e: any) {
				error(e?.message || 'Failed to update product');
			}
		});
	};

	const deleteProduct = async () => {
		startTransition(async () => {
			try {
				const res = await fetch(`${base}/api/products/${product.id}?hard=1`, { method: 'DELETE' });
				if (!res.ok) throw new Error(await res.text());
				success('Product deleted');
				router.push('/products');
				router.refresh();
			} catch (e: any) {
				error(e?.message || 'Failed to delete product');
			}
		});
	};

	const addImageByUrl = async (formData: FormData) => {
		const url = String(formData.get('imageUrl') || '');
		if (!url) return;
		startTransition(async () => {
			try {
				const res = await fetch(`${base}/api/products/${product.id}/images`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ images: [{ url }] })
				});
				if (!res.ok) throw new Error(await res.text());
				success('Image added');
				router.refresh();
			} catch (e: any) {
				error(e?.message || 'Failed to add image');
			}
		});
	};

	const removeImage = async (url: string) => {
		if (!url) return;
		startTransition(async () => {
			try {
				const res = await fetch(`${base}/api/products/${product.id}/images`, {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ urls: [url] })
				});
				if (!res.ok) throw new Error(await res.text());
				success('Image removed');
				router.refresh();
			} catch (e: any) {
				error(e?.message || 'Failed to remove image');
			}
		});
	};

	return (
		<div className="space-y-6">
			<form action={updateProduct} className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<label className="text-sm font-medium">Name</label>
						<input name="name" defaultValue={product.name ?? ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Product name" />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Slug</label>
						<input name="slug" defaultValue={product.slug ?? ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="product-slug" />
					</div>
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">Description</label>
					<textarea name="description" defaultValue={product.description ?? ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Product description" rows={4} />
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">Category</label>
					<select name="categoryId" defaultValue={product.category?.id ?? ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2">
						<option value="">No Category</option>
						{categories.map((cat) => (
							<option key={cat.id} value={cat.id}>{cat.name}</option>
						))}
					</select>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="space-y-2">
						<label className="text-sm font-medium">Price</label>
						<input name="price" defaultValue={product.price_cents ? (product.price_cents / 100).toString() : ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="1500" />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Sale Price</label>
						<input name="salePrice" defaultValue={product.sale_price_cents ? (product.sale_price_cents / 100).toString() : ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="1400" />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Stock</label>
						<input name="stock" defaultValue={String(product.stock ?? 0)} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="25" />
					</div>
				</div>
				<div className="flex items-center justify-end gap-3">
					<Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Button>
				</div>
			</form>

			<div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
				<div className="font-semibold">Images</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{(product.images ?? []).map((im, idx) => {
						const url = im.url ?? im.image_url;
						return (
							<div key={idx} className="space-y-2">
								<div className="aspect-square overflow-hidden rounded-md border border-neutral-800 bg-neutral-800">
									{url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
								</div>
								<Button
									type="button"
									variant="destructive"
									className="w-full"
									onClick={() => removeImage(url || '')}
									disabled={isPending}
								>
									Remove
								</Button>
							</div>
						);
					})}
				</div>
				<form action={addImageByUrl} className="flex items-center gap-2">
					<input name="imageUrl" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="https://..." />
					<Button type="submit" variant="outline" disabled={isPending}>{isPending ? 'Adding...' : 'Add by URL'}</Button>
				</form>
			</div>

			<form action={deleteProduct} className="flex justify-end">
				<Button type="submit" variant="destructive" disabled={isPending}>{isPending ? 'Deleting...' : 'Delete'}</Button>
			</form>
		</div>
	);
}


