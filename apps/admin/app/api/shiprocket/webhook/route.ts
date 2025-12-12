import { NextRequest, NextResponse } from 'next/server';
import { verifyShiprocketWebhook } from '@nts/integrations';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-shiprocket-signature') ?? undefined;
  try {
    verifyShiprocketWebhook(signature, raw);
    const payload = JSON.parse(raw);
    
    // Update order status in DB from payload
    // Shiprocket webhook payload typically includes order_id and status
    const supabase = getSupabaseAdminClient();
    const orderId = (payload as any)?.order_id || (payload as any)?.order?.order_id;
    const status = (payload as any)?.status || (payload as any)?.order?.status;
    
    if (orderId && status) {
      // Map Shiprocket status to our order_status enum
      let mappedStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' = 'processing';
      
      if (status === 'shipped' || status === 'RTO' || status === 'out_for_delivery') {
        mappedStatus = 'shipped';
      } else if (status === 'delivered') {
        mappedStatus = 'delivered';
      } else if (status === 'cancelled' || status === 'cancel') {
        mappedStatus = 'cancelled';
      } else if (status === 'returned' || status === 'RTO') {
        mappedStatus = 'returned';
      }
      
      await supabase
        .from('orders')
        .update({ 
          status: mappedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      // Also update metadata with Shiprocket tracking info if available
      if ((payload as any)?.tracking_number || (payload as any)?.awb_code) {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('metadata')
          .eq('id', orderId)
          .single();
        
        const metadata = existingOrder?.metadata || {};
        await supabase
          .from('orders')
          .update({
            metadata: {
              ...metadata,
              shiprocket: {
                tracking_number: (payload as any)?.tracking_number || (payload as any)?.awb_code,
                status: status,
                updated_at: new Date().toISOString()
              }
            }
          })
          .eq('id', orderId);
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 400 });
  }
}


