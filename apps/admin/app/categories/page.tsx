type Category = { id: string; name: string; slug: string; image_url?: string | null };
import { revalidatePath } from 'next/cache';

async function getCategories(): Promise<Category[]> {
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/categories`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({ data: [] }));
  return json.data ?? [];
}

async function createCategoryAction(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim().toLowerCase();
  const imageUrl = String(formData.get('imageUrl') || '').trim() || undefined;
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/categories`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, slug, imageUrl })
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/categories');
}

async function updateCategoryAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim().toLowerCase();
  const imageUrl = String(formData.get('imageUrl') || '').trim();
  if (!id) throw new Error('Missing category id');
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const payload: any = {};
  if (name) payload.name = name;
  if (slug) payload.slug = slug;
  payload.imageUrl = imageUrl || null;
  const res = await fetch(`${base}/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/categories');
}

async function deleteCategoryAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('Missing category id');
  const base = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || `http://localhost:${process.env.PORT ?? '3001'}`;
  const res = await fetch(`${base}/api/categories/${id}?hard=1`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/categories');
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Categories</h2>
        <a href="/products/add" className="text-sm text-pink-600 hover:underline">Add Product →</a>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <form action={createCategoryAction} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
          <h3 className="font-semibold mb-2">Add Category</h3>
          <input name="name" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="Category name" required />
          <input name="slug" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="kurtis" required />
          <input name="imageUrl" className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" placeholder="/categories/kurtis.jpg" />
          <button className="px-4 py-2 rounded-md bg-pink-600 text-white" type="submit">Create</button>
        </form>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="font-semibold mb-2">Existing Categories</h3>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="space-y-2 border border-neutral-800 rounded-md p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-neutral-400">{c.slug}</span>
                </div>
                <form action={updateCategoryAction} className="grid gap-2 md:grid-cols-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} className="rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" />
                  <input name="slug" defaultValue={c.slug} className="rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" />
                  <div className="flex items-center gap-2">
                    <input name="imageUrl" defaultValue={c.image_url ?? ''} className="w-full rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-500 px-3 py-2" />
                    <button className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-sm" type="submit">Save</button>
                  </div>
                </form>
                <form action={deleteCategoryAction} className="flex">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="px-3 py-2 rounded-md bg-red-600 text-white text-sm" type="submit">Delete</button>
                </form>
              </li>
            ))}
            {categories.length === 0 && <li className="text-neutral-400">No categories.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}



