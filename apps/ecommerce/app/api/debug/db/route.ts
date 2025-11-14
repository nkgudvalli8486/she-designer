import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  const { data: prods, error: prodErr } = await supabase
    .from('products')
    .select('id, name, slug, category_id, price_cents, sale_price_cents, deleted_at')
    .limit(5);

  return NextResponse.json({
    env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing'
    },
    categories: cats ?? [],
    categoriesError: catErr?.message ?? null,
    products: prods ?? [],
    productsError: prodErr?.message ?? null
  });
}


