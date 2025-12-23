import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';
import { z } from 'zod';

const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  notes: z.string().optional()
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateStatusSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  
  const supabase = getSupabaseAdminClient();
  
  // Fetch current order to validate
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, payment_status')
    .eq('id', orderId)
    .single();
  
  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  
  // Build update data
  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString()
  };
  
  // Add tracking information if provided
  if (parsed.data.trackingNumber || parsed.data.trackingUrl) {
    const currentMetadata = (order as any).metadata || {};
    updateData.metadata = {
      ...currentMetadata,
      tracking_number: parsed.data.trackingNumber || currentMetadata.tracking_number,
      tracking_url: parsed.data.trackingUrl || currentMetadata.tracking_url,
      status_updated_at: new Date().toISOString(),
      status_notes: parsed.data.notes || currentMetadata.status_notes
    };
  }
  
  // Update order
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error updating order status:', updateError);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
  
  return NextResponse.json({ 
    success: true, 
    order: updatedOrder 
  });
}

