'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nts/ui';
import { useToast } from '@/components/toast';
import { getAdminBaseUrl } from '@/src/lib/base-url';

type Category = { id: string; name: string; slug: string; image_url?: string | null };

function parseRupeesToCents(input: string | null): number | null {
	if (!input) return null;
	const cleaned = `${input}`.replace(/[^\d.,]/g, '').replace(',', '');
	if (!cleaned) return null;
	const num = Number(cleaned);
	if (Number.isNaN(num)) return null;
	return Math.round(num * 100);
}

function slugify(input: string, fallback: string) {
	const base = input && input.length ? input : fallback;
	return base
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-+/g, '-');
}

export function AddProductForm({ categories }: { categories: Category[] }) {
	const router = useRouter();
	const { success, error } = useToast();
	const [isPending, startTransition] = useTransition();
	const [isUploading, setUploading] = useState(false);

	const handleSubmit = async (formData: FormData) => {
		const name = String(formData.get('name') || '').trim();
		const rawSlug = String(formData.get('slug') || '').trim();
		const categorySlug = String(formData.get('categorySlug') || '').trim().toLowerCase();
		const priceStr = String(formData.get('price') || '');
		const originalStr = String(formData.get('originalPrice') || '');
		const description = String(formData.get('description') || '');
		const stockStr = String(formData.get('stock') || '');

		const priceC = parseRupeesToCents(priceStr) ?? 0;
		const origC = parseRupeesToCents(originalStr);
		let priceCents = priceC;
		let salePriceCents: number | null = null;
		if (origC && origC > 0) {
			if (origC > priceC) {
				priceCents = origC;
				salePriceCents = priceC;
			} else {
				priceCents = priceC;
				salePriceCents = origC;
			}
		}

		const slug = slugify(rawSlug, name);
		const base = getAdminBaseUrl();

		// Upload images if provided
		const imageFiles = (formData.getAll('images') as unknown as File[]).filter(Boolean);
		let imageUrls: string[] = [];
		if (imageFiles.length) {
			setUploading(true);
			try {
				const fd = new FormData();
				for (const f of imageFiles) {
					fd.append('files', f as any, (f as any)?.name ?? 'image.jpg');
				}
				const up = await fetch(`${base}/api/uploads`, { method: 'POST', body: fd });
				if (!up.ok) {
					const t = await up.text();
					throw new Error(t || 'Image upload failed');
				}
				const uj = await up.json().catch(() => ({}));
				if (Array.isArray(uj?.urls)) imageUrls = uj.urls as string[];
			} catch (e: any) {
				setUploading(false);
				error(e?.message || 'Image upload failed');
				return;
			}
			setUploading(false);
		}

		const payload = {
			name,
			slug,
			categorySlug: categorySlug || undefined,
			priceCents,
			salePriceCents: salePriceCents ?? undefined,
			description,
			stock: Number.isFinite(Number(stockStr)) ? Number(stockStr) : 0,
			images: imageUrls.map((url, i) => ({ url, position: i }))
		};

		startTransition(async () => {
			try {
				const res = await fetch(`${base}/api/products`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload),
					cache: 'no-store'
				});
				if (!res.ok) {
					const txt = await res.text();
					const friendly = /products_slug_key/i.test(txt)
						? 'Slug already exists. Please choose a different slug.'
						: txt || 'Failed to create product';
					throw new Error(friendly);
				}
				success('Product created');
				router.push('/products');
				router.refresh();
			} catch (e: any) {
				error(e?.message || 'Failed to create product');
			}
		});
	};

	return (
		<form action={handleSubmit} className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<label className="text-sm font-medium">Product Name *</label>
					<input name="name" required className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Enter product name" />
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">Product Slug *</label>
					<input name="slug" required className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="product-slug-url" />
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<label className="text-sm font-medium">Category *</label>
					<select name="categorySlug" required className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-3 py-2" defaultValue="">
						<option value="" disabled>Select Category</option>
						{categories.map((c) => (
							<option key={c.id} value={c.slug}>{c.name}</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">Subcategory</label>
					<select name="subcategory" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-3 py-2" defaultValue="">
						<option value="">Select Subcategory</option>
						<option value="bridal">Bridal</option>
						<option value="party-wear">Party Wear</option>
					</select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<label className="text-sm font-medium">Price *</label>
					<input name="price" required className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="₹1,500.00 or 1500" />
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">Original Price</label>
					<input name="originalPrice" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="₹2,000.00" />
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<label className="text-sm font-medium">Stock (Quantity) *</label>
					<input
						name="stock"
						type="number"
						min="0"
						defaultValue="0"
						required
						className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-3 py-2"
						placeholder="0"
					/>
					<p className="text-xs text-muted-foreground">If set to 0, the product will be marked Out of Stock automatically.</p>
				</div>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">Product Description</label>
				<textarea name="description" className="min-h-40 w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Enter product description" />
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium">Images</label>
				<input name="images" type="file" multiple className="block w-full text-sm text-neutral-300 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-pink-600 file:text-white hover:file:bg-pink-700" />
				<p className="text-xs text-muted-foreground">Select one or more images (JPG/PNG/WebP). Uploaded files will be stored in the product-images bucket.</p>
			</div>

			<div className="flex items-center justify-end gap-3">
				<Button variant="outline" asChild><a href="/products">Cancel</a></Button>
				<Button type="submit" disabled={isPending || isUploading}>
					{isUploading ? 'Uploading...' : isPending ? 'Saving...' : 'Save Product'}
				</Button>
			</div>
		</form>
	);
}


