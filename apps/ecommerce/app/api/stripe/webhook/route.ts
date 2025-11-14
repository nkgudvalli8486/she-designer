import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeWebhook, createShiprocketOrder } from '@nts/integrations';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature') || '';
  const raw = await req.text();
  try {
    const event = verifyStripeWebhook({ payload: raw, signature });
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderId = session?.metadata?.orderId as string | undefined;
      if (orderId) {
        const supabase = getSupabaseAdminClient();
        await supabase
          .from('orders')
          .update({ payment_status: 'paid', status: 'processing' })
          .eq('id', orderId);
        // Optionally create a Shiprocket order
        try {
          await createShiprocketOrder({
            order_id: orderId,
            order_date: new Date().toISOString(),
            // Minimal placeholder fields; map actual payloads from your DB/cart
            billing_customer_name: 'Customer',
            billing_city: 'City',
            billing_state: 'State',
            billing_pincode: '000000',
            billing_country: 'India',
            billing_email: 'customer@example.com',
            billing_phone: '0000000000',
            order_items: [
              { name: 'Sample Dress', sku: 'sku_1', units: 1, selling_price: 4990 }
            ],
            payment_method: 'Prepaid',
            shipping_is_billing: true
          });
        } catch {
          // no-op: Shiprocket optional for now
        }
      }
    }
    return NextResponse.json({ received: true, type: event.type });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 400 });
  }
}


