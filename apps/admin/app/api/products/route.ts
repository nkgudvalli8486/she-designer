import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const ProductImageSchema = z.object({
  url: z.string().url(),
  position: z.number().int().nonnegative().optional().default(0)
});

const CreateProductSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-')
    )
    .refine((v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), { message: 'Invalid' }),
  sku: z.string().optional().nullable(),
  description: z.string().optional().default(''),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  priceCents: z.number().int().nonnegative(),
  salePriceCents: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  images: z.array(ProductImageSchema).optional().default([])
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = getSupabaseAdminClient();

  let categoryId = input.categoryId ?? null;
  if (!categoryId && input.categorySlug) {
    const { data: cat, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', input.categorySlug)
      .single();
    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 400 });
    categoryId = cat?.id ?? null;
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name: input.name,
      slug: input.slug,
      sku: input.sku ?? null,
      description: input.description,
      category_id: categoryId,
      price_cents: input.priceCents,
      sale_price_cents: input.salePriceCents ?? null,
      original_price_cents: null,
      price: (input.priceCents as unknown as number) / 100.0,
      original_price: null,
      stock: input.stock
    })
    .select('id, name, slug')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (input.images && input.images.length) {
    const candidates = [
      (u: string, i: number) => ({ product_id: product.id, image_url: u, position: i, alt_text: '' }),
      (u: string, i: number) => ({ product_id: product.id, image_url: u }),
      (u: string, i: number) => ({ product_id: product.id, url: u, position: i, alt_text: '' }),
      (u: string, i: number) => ({ product_id: product.id, url: u })
    ];
    let inserted = false;
    let lastErr: string | null = null;
    for (const build of candidates) {
      const rows = input.images.map((im, idx) => build(im.url, im.position ?? idx));
      const { error: imgErr } = await supabase.from('product_images').insert(rows);
      if (!imgErr) {
        inserted = true;
        break;
      }
      lastErr = imgErr.message;
      // try next shape
    }
    if (!inserted) {
      return NextResponse.json({ data: product, warning: `Images not saved: ${lastErr ?? 'unknown error'}` }, { status: 201 });
    }
  }

  return NextResponse.json({ data: product }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() || '';
  const categorySlug = url.searchParams.get('category')?.trim() || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getSupabaseAdminClient();

  // Resolve category id if provided
  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
    categoryId = cat?.id ?? null;
  }

  let query = supabase
    .from('products')
    .select('id, name, slug, sku, price_cents, sale_price_cents, original_price_cents, price, original_price, stock, category_id, created_at', { count: 'exact' })
    .is('deleted_at', null);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, page, limit, total: count ?? 0 });
}


