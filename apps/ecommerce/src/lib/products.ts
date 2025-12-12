import { getSupabaseServerClient } from './supabase-server';

export async function listProductsByCollectionSlug(slug: string) {
  const supabase = getSupabaseServerClient();
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (catErr) {
    console.error('Category fetch error', catErr.message);
    return [];
  }
  if (!category) return [];
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, sale_price_cents, stock')
    .eq('category_id', category.id)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (prodErr) {
    console.error('Products fetch error', prodErr.message);
    return [];
  }
  const list = products ?? [];
  if (list.length === 0) return [];
  const ids = list.map((p) => p.id);
  const { data: imgs, error: imgErr } = await supabase
    .from('product_images')
    .select('*')
    .in('product_id', ids)
    .order('position', { ascending: true });
  if (imgErr) {
    console.error('Images fetch error', imgErr.message);
    return list;
  }
  const pidToImages = new Map<string, Array<{ url: string; position: number }>>();
  for (const im of imgs ?? []) {
    const pid = (im as any).product_id as string;
    const url = ((im as any).url ?? (im as any).image_url) as string;
    const position = Number((im as any).position ?? 0);
    const arr = pidToImages.get(pid) ?? [];
    if (url) arr.push({ url, position });
    pidToImages.set(pid, arr);
  }
  return list.map((p) => ({ ...p, product_images: pidToImages.get(p.id) ?? [] }));
}

export async function getProductBySlug(slug: string) {
  const supabase = getSupabaseServerClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, slug, description, price_cents, sale_price_cents, stock')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();
  if (error) {
    console.error('Product fetch error', error.message);
    return null;
  }
  if (!product) return null;
  const { data: imgs } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', product.id)
    .order('position', { ascending: true });
  const normalized = (imgs ?? []).map((im: any) => ({
    url: im.url ?? im.image_url,
    position: Number(im.position ?? 0)
  }));
  return { ...product, product_images: normalized };
}

export async function searchProducts(query: string) {
  const supabase = getSupabaseServerClient();
  
  // Only search if query is more than 3 characters
  if (!query || query.trim().length < 3) {
    return [];
  }
  
  const searchTerm = query.trim();
  
  // Search in both name and description using OR condition
  // Using two separate filters and combining with or()
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, description, price_cents, sale_price_cents, stock')
    .is('deleted_at', null)
    .eq('is_active', true)
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Product search error', error.message);
    return [];
  }
  
  const list = products ?? [];
  if (list.length === 0) return [];
  
  const ids = list.map((p) => p.id);
  const { data: imgs, error: imgErr } = await supabase
    .from('product_images')
    .select('*')
    .in('product_id', ids)
    .order('position', { ascending: true });
    
  if (imgErr) {
    console.error('Images fetch error', imgErr.message);
    return list;
  }
  
  const pidToImages = new Map<string, Array<{ url: string; position: number }>>();
  for (const im of imgs ?? []) {
    const pid = (im as any).product_id as string;
    const url = ((im as any).url ?? (im as any).image_url) as string;
    const position = Number((im as any).position ?? 0);
    const arr = pidToImages.get(pid) ?? [];
    if (url) arr.push({ url, position });
    pidToImages.set(pid, arr);
  }
  
  return list.map((p) => ({ ...p, product_images: pidToImages.get(p.id) ?? [] }));
}

export async function searchCategories(query: string) {
  const supabase = getSupabaseServerClient();
  
  // Only search if query is more than 3 characters
  if (!query || query.trim().length < 3) {
    return [];
  }
  
  const searchTerm = query.trim();
  
  // Search in category name
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url')
    .is('deleted_at', null)
    .ilike('name', `%${searchTerm}%`)
    .order('name', { ascending: true });
    
  if (error) {
    console.error('Category search error', error.message);
    return [];
  }
  
  return categories ?? [];
}


