import Stripe from 'stripe';
import { z } from 'zod';

export function getStripe(secretKey?: string) {
  const key = secretKey ?? process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    typescript: true
  });
}

export const CheckoutItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().int().nonnegative(),
  currency: z.string().min(3),
  quantity: z.number().int().positive()
});

export type CheckoutItem = z.infer<typeof CheckoutItemSchema>;

export async function createCheckoutSession(params: {
  items: CheckoutItem[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripe();
  const line_items = params.items.map((item) => ({
    price_data: {
      currency: item.currency,
      product_data: { name: item.name },
      unit_amount: item.amount
    },
    quantity: item.quantity
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    metadata: params.metadata
  });

  return session;
}

export function verifyStripeWebhook(options: {
  payload: string | Buffer;
  signature: string | string[] | Buffer;
  secret?: string;
}) {
  const stripe = getStripe();
  const secret = options.secret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }
  return stripe.webhooks.constructEvent(options.payload, options.signature as string, secret);
}


