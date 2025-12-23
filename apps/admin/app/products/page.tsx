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

import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

async function fetchProducts(params: { search?: string; category?: string; page?: number; limit?: number }) {
  const supabase = getSupabaseAdminClient();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Resolve category id if provided
  let categoryId: string | null = null;
  if (params.category) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', params.category).maybeSingle();
    categoryId = cat?.id ?? null;
  }

  let query = supabase
    .from('products')
    .select('id, name, slug, sku, price_cents, sale_price_cents, stock', { count: 'exact' })
    .is('deleted_at', null);

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  
  if (error) {
    console.error('Error fetching products:', error);
    return { data: [], total: 0, page, limit };
  }

  return { data: data || [], total: count ?? 0, page, limit };
}

async function fetchCategories(): Promise<Category[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  return data || [];
}

async function updateStockAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const stock = Number(formData.get('stock') || '0');
  const { getSupabaseAdminClient } = await import('@/src/lib/supabase-admin');
  const supabase = getSupabaseAdminClient();
  
  const { error } = await supabase
    .from('products')
    .update({ stock, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  revalidatePath('/products');
}

import { revalidatePath } from 'next/cache';

async function softDeleteAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const { getSupabaseAdminClient } = await import('@/src/lib/supabase-admin');
  const supabase = getSupabaseAdminClient();
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(error.message);
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
          <thead className="text-left text-neutral-300 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data as Product[]).map((p) => (
              <tr key={p.id} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                <td className="px-4 py-3 text-neutral-200">{p.name}</td>
                <td className="px-4 py-3 text-neutral-200">{p.sku ?? '—'}</td>
                <td className="px-4 py-3 text-neutral-200">₹ {(((p.sale_price_cents ?? p.price_cents) ?? 0) / 100).toFixed(0)}</td>
                <td className="px-4 py-3">
                  <form action={updateStockAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          name="stock"
                          type="number"
                          defaultValue={p.stock ?? 0}
                          min={0}
                          step={1}
                          className="w-24 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1"
                          title="Available stock quantity. You can increase this when new inventory arrives or decrease when items are sold/removed."
                        />
                        <span className="text-xs text-neutral-400">units</span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        Current: <span className="font-semibold text-neutral-300">{p.stock ?? 0}</span>
                        {p.stock !== null && p.stock <= 0 && (
                          <span className="ml-2 text-red-400">(Out of stock)</span>
                        )}
                      </div>
                    </div>
                    <Button type="submit" variant="outline" className="whitespace-nowrap">Save</Button>
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



