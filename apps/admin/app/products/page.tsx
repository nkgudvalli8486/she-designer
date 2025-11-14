import Link from 'next/link';
import { Button } from '@nts/ui';

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price_cents: number | null;
  sale_price_cents: number | null;
  stock: number | null;
};

type Category = { id: string; name: string; slug: string };

async function fetchProducts(params: { search?: string; category?: string; page?: number; limit?: number }) {
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));
  const res = await fetch(`${base}/api/products?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) return { data: [], total: 0, page: 1, limit: 20 };
  return res.json();
}

async function fetchCategories(): Promise<Category[]> {
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/categories`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

async function updateStockAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const stock = Number(formData.get('stock') || '0');
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  await fetch(`${base}/api/products/bulk`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ updates: [{ id, stock }] })
  });
  revalidatePath('/products');
}

import { revalidatePath } from 'next/cache';

async function softDeleteAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/products/${id}?hard=1`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  revalidatePath('/products');
}

export default async function ProductsPage(props: { searchParams: Promise<{ q?: string; c?: string; page?: string }> }) {
  const sp = await props.searchParams;
  const q = sp?.q ?? '';
  const c = sp?.c ?? '';
  const page = Number(sp?.page ?? '1') || 1;
  const [{ data, total, limit }, categories] = await Promise.all([
    fetchProducts({ search: q, category: c, page }),
    fetchCategories()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">All Products</h2>
        <Button asChild><Link href="/products/add">Add Product</Link></Button>
      </div>
      <form className="flex items-center gap-3" action="/products" method="get">
        <input name="q" defaultValue={q} className="w-full md:w-80 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Search products..." />
        <select name="c" defaultValue={c} className="rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-3 py-2">
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}
        </select>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-neutral-300">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data as Product[]).map((p) => (
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.sku ?? '—'}</td>
                <td className="px-4 py-3">₹ {(((p.sale_price_cents ?? p.price_cents) ?? 0) / 100).toFixed(0)}</td>
                <td className="px-4 py-3">
                  <form action={updateStockAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="stock"
                      type="number"
                      defaultValue={p.stock ?? 0}
                      min={0}
                      className="w-24 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1"
                    />
                    <Button type="submit" variant="outline">Save</Button>
                  </form>
                </td>
                <td className="px-4 py-3 flex items-center gap-3">
                  <Link className="text-pink-600 hover:underline" href={`/products/${p.id}`}>Edit</Link>
                  <form action={softDeleteAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="destructive">Delete</Button>
                  </form>
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td className="px-4 py-6 text-neutral-400" colSpan={5}>No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <Link href={`/products?${new URLSearchParams({ q, c, page: String(Math.max(1, page - 1)) }).toString()}`} className="rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1">Prev</Link>
          <span>Page {page}</span>
          <Link href={`/products?${new URLSearchParams({ q, c, page: String(page + 1) }).toString()}`} className="rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1">Next</Link>
        </div>
      </div>
    </div>
  );
}



