import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

const BulkSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        stock: z.number().int().nonnegative().optional(),
        isActive: z.boolean().optional()
      })
    )
    .optional(),
  softDeleteIds: z.array(z.string().uuid()).optional()
});

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const body = await req.json().catch(() => ({}));
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.updates && parsed.data.updates.length) {
    for (const u of parsed.data.updates) {
      const update: any = {};
      if (typeof u.stock === 'number') update.stock = u.stock;
      if (typeof u.isActive === 'boolean') update.is_active = u.isActive;
      const { error } = await supabase.from('products').update(update).eq('id', u.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (parsed.data.softDeleteIds && parsed.data.softDeleteIds.length) {
    const now = new Date().toISOString();
    const { error } = await supabase.from('products').update({ deleted_at: now }).in('id', parsed.data.softDeleteIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}


