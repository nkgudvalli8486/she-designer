import { getSupabaseAdminClient } from './supabase-admin';

export async function createOrderDraft(params: {
  customerId?: string | null;
  currency?: string;
  totalCents: number;
  madeToOrder?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_id: params.customerId ?? null,
      status: 'pending',
      payment_status: 'unpaid',
      currency: params.currency ?? 'inr',
      total_cents: params.totalCents,
      made_to_order: params.madeToOrder ?? false,
      metadata: params.metadata ?? {}
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}


