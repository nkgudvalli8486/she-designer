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
  customerName?: string;
  shippingAddress?: Record<string, unknown>;
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

  // For Indian Stripe regulations, we need to collect shipping address
  // and provide customer information for export transactions
  // Build metadata object with all required information
  const metadata: Record<string, string> = { ...(params.metadata || {}) };
  
  // Include customer name in metadata for Indian export compliance
  if (params.customerName) {
    metadata.customer_name = params.customerName;
  }

  // Include shipping address details in metadata for reference
  if (params.shippingAddress) {
    const addr = params.shippingAddress as any;
    metadata.shipping_name = addr.name || params.customerName || '';
    if (addr.phone) {
      metadata.shipping_phone = addr.phone;
    }
    metadata.shipping_address = JSON.stringify({
      line1: addr.address1 || addr.line1 || '',
      line2: addr.address2 || addr.line2 || '',
      city: addr.district || addr.city || '',
      state: addr.state || '',
      postal_code: addr.pincode || addr.postal_code || '',
      country: addr.country || 'IN'
    });
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    metadata,
    // Collect shipping address (required for Indian exports)
    // This ensures Stripe collects customer name and address for export compliance
    shipping_address_collection: {
      allowed_countries: ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'MY'] // Add more as needed
    }
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

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

export async function retrieveCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  return await stripe.checkout.sessions.retrieve(sessionId);
}

export async function createRefund(params: {
  paymentIntentId?: string;
  chargeId?: string;
  amount?: number; // Amount in cents, if not provided, full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}) {
  const stripe = getStripe();
  
  const refundParams: Stripe.RefundCreateParams = {
    amount: params.amount,
    reason: params.reason || 'requested_by_customer',
    metadata: params.metadata
  };
  
  // Use payment_intent if provided, otherwise use charge
  if (params.paymentIntentId) {
    refundParams.payment_intent = params.paymentIntentId;
  } else if (params.chargeId) {
    refundParams.charge = params.chargeId;
  } else {
    throw new Error('Either paymentIntentId or chargeId must be provided');
  }
  
  return await stripe.refunds.create(refundParams);
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function listPaymentIntents(params?: {
  customer?: string;
  limit?: number;
}) {
  const stripe = getStripe();
  return await stripe.paymentIntents.list(params);
}

export async function retrieveCharge(chargeId: string) {
  const stripe = getStripe();
  return await stripe.charges.retrieve(chargeId);
}

export async function getChargeIdFromPaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  // Payment intent has charges array - get the latest successful charge
  if (paymentIntent.latest_charge) {
    return typeof paymentIntent.latest_charge === 'string' 
      ? paymentIntent.latest_charge 
      : paymentIntent.latest_charge.id;
  }
  return null;
}


