import { createCheckoutSession } from '@nts/integrations';
import { redirect } from 'next/navigation';
import { createOrderDraft } from '@/src/lib/orders';

async function startCheckout() {
  'use server';
  // TODO: Build items from cart stored in DB/session
  const total = 499000;
  const orderId = await createOrderDraft({
    totalCents: total,
    metadata: { source: 'ecommerce' }
  });
  const session = await createCheckoutSession({
    items: [
      { id: 'sku_1', name: 'Sample Dress', amount: 499000, currency: 'inr', quantity: 1 }
    ],
    successUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
    cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    metadata: { orderId }
  });
  redirect(session.url ?? '/cart');
}

export default function CheckoutPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <form action={startCheckout} className="mt-6 space-y-4">
        {/* TODO: Collect address and shipping method */}
        <button className="h-10 px-4 rounded-md bg-primary text-primary-foreground">
          Pay with Stripe
        </button>
      </form>
    </div>
  );
}


