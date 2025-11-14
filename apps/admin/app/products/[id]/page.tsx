import Link from 'next/link';
import { Button } from '@nts/ui';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function fetchProduct(id: string) {
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/products/${id}`, { cache: 'no-store' });
  if (!res.ok) return { id };
  const json = await res.json();
  return json.data || { id };
}

async function updateProductAction(id: string, formData: FormData) {
  'use server';
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const payload = {
    name: String(formData.get('name') || ''),
    slug: String(formData.get('slug') || ''),
    priceCents: Math.round(Number(formData.get('price') || '0') * 100),
    salePriceCents: String(formData.get('salePrice') || '') ? Math.round(Number(formData.get('salePrice') || '0') * 100) : null,
    stock: Number(formData.get('stock') || '0')
  };
  const res = await fetch(`${base}/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  revalidatePath(`/products/${id}`);
  revalidatePath('/products');
  redirect('/products');
}

async function deleteProductAction(id: string) {
  'use server';
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/products/${id}?hard=1`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/products');
  redirect('/products');
}

async function addImageByUrlAction(id: string, formData: FormData) {
  'use server';
  const url = String(formData.get('imageUrl') || '');
  if (!url) return;
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  await fetch(`${base}/api/products/${id}/images`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ images: [{ url }] })
  });
  revalidatePath(`/products/${id}`);
}

async function removeImageAction(id: string, formData: FormData) {
  'use server';
  const url = String(formData.get('url') || '');
  if (!url) return;
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  await fetch(`${base}/api/products/${id}/images`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ urls: [url] })
  });
  revalidatePath(`/products/${id}`);
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProduct(id);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:underline">Back to Products</Link>
        <span>•</span>
        <span className="text-foreground font-medium">Edit Product</span>
      </div>
      <form action={updateProductAction.bind(null, id)} className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
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
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Price</label>
            <input name="price" defaultValue={product.price_cents ? (product.price_cents/100).toString() : ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="1500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sale Price</label>
            <input name="salePrice" defaultValue={product.sale_price_cents ? (product.sale_price_cents/100).toString() : ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="1400" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Stock</label>
            <input name="stock" defaultValue={String(product.stock ?? 0)} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="25" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
        <div className="font-semibold">Images</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(product.images ?? []).map((im: any, idx: number) => {
            const url = im.url ?? im.image_url;
            return (
              <div key={idx} className="space-y-2">
                <div className="aspect-square overflow-hidden rounded-md border border-neutral-800 bg-neutral-800">
                  {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <form action={removeImageAction.bind(null, id)}>
                  <input type="hidden" name="url" value={url} />
                  <Button type="submit" variant="destructive" className="w-full">Remove</Button>
                </form>
              </div>
            );
          })}
        </div>
        <form action={addImageByUrlAction.bind(null, id)} className="flex items-center gap-2">
          <input name="imageUrl" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="https://..." />
          <Button type="submit" variant="outline">Add by URL</Button>
        </form>
      </div>
      <form action={deleteProductAction.bind(null, id)} className="flex justify-end">
        <Button type="submit" variant="destructive">Delete</Button>
      </form>
    </div>
  );
}


