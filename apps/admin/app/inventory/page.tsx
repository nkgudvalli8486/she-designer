import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Button } from '@nts/ui';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

type InventoryRow = {
  id: string;
  sku: string | null;
  name: string;
  slug: string;
  stock: number | null;
  reserved: number;
};

async function fetchInventory(params: { search?: string; page?: number; limit?: number }): Promise<{ rows: InventoryRow[]; total: number; page: number; limit: number }> {
  const supabase = getSupabaseAdminClient();
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('products')
    .select('id, name, slug, sku, stock', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`);
  }

  const { data: products, error: prodErr, count } = await query;
  if (prodErr) {
    console.error('Inventory products fetch error:', prodErr);
    return { rows: [], total: 0, page, limit };
  }

  const list = (products ?? []) as Array<{ id: string; name: string; slug: string; sku: string | null; stock: number | null }>;
  if (list.length === 0) return { rows: [], total: count ?? 0, page, limit };

  // Reserved = sum(cart_items.quantity) for the product across all carts (guest + logged-in)
  const ids = list.map((p) => p.id);
  const { data: cartRows, error: cartErr } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .in('product_id', ids);

  if (cartErr) {
    console.error('Inventory cart_items fetch error:', cartErr);
  }

  const reservedMap = new Map<string, number>();
  for (const r of (cartRows ?? []) as any[]) {
    const pid = String(r.product_id || '');
    const qty = Number(r.quantity ?? 0);
    if (!pid) continue;
    reservedMap.set(pid, (reservedMap.get(pid) ?? 0) + (Number.isFinite(qty) ? qty : 0));
  }

  const rows: InventoryRow[] = list.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    stock: p.stock,
    reserved: reservedMap.get(p.id) ?? 0
  }));

  return { rows, total: count ?? 0, page, limit };
}

async function updateStockAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const stock = Number(formData.get('stock') || '0');
  const { getSupabaseAdminClient } = await import('@/src/lib/supabase-admin');
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from('products')
    .update({ stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/inventory');
}

export default async function InventoryPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await props.searchParams;
  const q = sp?.q ?? '';
  const page = Number(sp?.page ?? '1') || 1;

  const { rows, total } = await fetchInventory({ search: q, page, limit: 30 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Inventory</h2>
        <form action="/inventory" method="get" className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search products…"
            className="w-64 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-3 py-2 text-sm"
          />
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-neutral-300 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Reserved</th>
              <th className="px-4 py-3 font-semibold">Available</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const stock = Number(r.stock ?? 0);
              const reserved = Number(r.reserved ?? 0);
              const available = Math.max(0, stock - reserved);
              return (
                <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                  <td className="px-4 py-3 text-neutral-200">{r.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-200">
                    <Link href={`/products/${r.id}`} className="text-pink-400 hover:text-pink-300 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-neutral-500">/{r.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-200">
                    <form action={updateStockAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="stock"
                        type="number"
                        defaultValue={stock}
                        min={0}
                        step={1}
                        className="w-24 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1"
                      />
                      <Button type="submit" variant="outline" className="whitespace-nowrap">Save</Button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-neutral-200">{reserved}</td>
                  <td className="px-4 py-3 text-neutral-200">
                    <span className={available <= 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                      {available}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/products/${r.id}`} className="text-sm text-neutral-300 hover:text-white hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-300">
        <div>Total: {total}</div>
        <div className="flex items-center gap-2">
          <Link
            href={`/inventory?${new URLSearchParams({ q, page: String(Math.max(1, page - 1)) }).toString()}`}
            className="rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1"
          >
            Prev
          </Link>
          <span>Page {page}</span>
          <Link
            href={`/inventory?${new URLSearchParams({ q, page: String(page + 1) }).toString()}`}
            className="rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1"
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}



