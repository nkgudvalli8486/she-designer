import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { rateLimit } from '@/src/lib/rate-limit';

function getClientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`pub_products:${ip}`, 90, 60_000);
  if (!rl.ok) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'retry-after': String(Math.ceil((rl.retryAfterMs ?? 0) / 1000)) }
    });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(60, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const search = (url.searchParams.get('search') || '').trim();
  const category = (url.searchParams.get('category') || '').trim();
  const sort = (url.searchParams.get('sort') || 'new').trim(); // new|price-asc|price-desc

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getSupabaseServerClient();

  let categoryId: string | null = null;
  if (category) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).maybeSingle();
    categoryId = cat?.id ?? null;
  }

  let query = supabase
    .from('products')
    .select('id, name, slug, price_cents, sale_price_cents, stock, created_at', { count: 'exact' })
    .is('deleted_at', null)
    .eq('is_active', true);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (sort === 'price-asc') query = query.order('price_cents', { ascending: true, nullsFirst: false });
  else if (sort === 'price-desc') query = query.order('price_cents', { ascending: false, nullsFirst: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query.range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const list = data ?? [];
  const ids = list.map((p) => p.id);
  let pidToImage: Record<string, string | null> = {};
  if (ids.length) {
    const { data: imgs } = await supabase
      .from('product_images')
      .select('product_id, url, image_url, position')
      .in('product_id', ids)
      .order('position', { ascending: true });
    for (const im of imgs ?? []) {
      const pid = (im as any).product_id as string;
      if (!(pid in pidToImage)) {
        pidToImage[pid] = ((im as any).url ?? (im as any).image_url) ?? null;
      }
    }
  }
  const items = list.map((p) => ({ ...p, image: pidToImage[p.id] ?? null }));
  return NextResponse.json({ data: items, page, limit, total: count ?? 0 });
}


