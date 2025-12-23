import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const UpdateSchema = z.object({
  id: z.string().min(1),
  stock: z.number().int().nonnegative()
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '30') || 30));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from('products')
    .select('id, name, slug, sku, stock', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (q) query = query.ilike('name', `%${q}%`);

  const { data: products, error: prodErr, count } = await query;
  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 400 });

  const list = (products ?? []) as Array<{ id: string; name: string; slug: string; sku: string | null; stock: number | null }>;
  const ids = list.map((p) => p.id);

  const reservedMap = new Map<string, number>();
  if (ids.length) {
    const { data: cartRows } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .in('product_id', ids);

    for (const r of (cartRows ?? []) as any[]) {
      const pid = String(r.product_id || '');
      const qty = Number(r.quantity ?? 0);
      if (!pid) continue;
      reservedMap.set(pid, (reservedMap.get(pid) ?? 0) + (Number.isFinite(qty) ? qty : 0));
    }
  }

  const rows = list.map((p) => ({
    ...p,
    reserved: reservedMap.get(p.id) ?? 0
  }));

  return NextResponse.json({ data: rows, page, limit, total: count ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from('products')
    .update({ stock: parsed.data.stock, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}


