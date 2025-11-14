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

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const ip = getClientIp(req);
  const rl = rateLimit(`pub_product:${ip}`, 120, 60_000);
  if (!rl.ok) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  const { slug } = await ctx.params;
  const supabase = getSupabaseServerClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('id, name, slug, description, price_cents, sale_price_cents, stock, created_at')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();
  if (error || !product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data: imgs } = await supabase
    .from('product_images')
    .select('url, image_url, position')
    .eq('product_id', product.id)
    .order('position', { ascending: true });
  const images = (imgs ?? []).map((im: any) => im.url ?? im.image_url).filter(Boolean);
  return NextResponse.json({ data: { ...product, images } });
}


