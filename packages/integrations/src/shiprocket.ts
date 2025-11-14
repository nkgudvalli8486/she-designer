import { z } from 'zod';

const ShiprocketAuthResponse = z.object({
  token: z.string()
});

export async function shiprocketLogin(baseUrl = process.env.SHIPROCKET_API_BASE) {
  if (!baseUrl) throw new Error('SHIPROCKET_API_BASE is not set');
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;
  if (!email || !password) {
    throw new Error('SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD is not set');
  }
  const res = await fetch(`${baseUrl}/v1/external/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error(`Shiprocket login failed: ${res.status}`);
  }
  const data = await res.json();
  return ShiprocketAuthResponse.parse(data).token;
}

export async function createShiprocketOrder(payload: Record<string, unknown>) {
  const baseUrl = process.env.SHIPROCKET_API_BASE;
  const token = await shiprocketLogin(baseUrl);
  const res = await fetch(`${baseUrl}/v1/external/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Shiprocket order creation failed: ${res.status}`);
  }
  return res.json();
}

export function verifyShiprocketWebhook(signatureHeader: string | undefined, rawBody: string) {
  // Placeholder HMAC verification by shared secret. Implement as per Shiprocket docs when enabled.
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('SHIPROCKET_WEBHOOK_SECRET is not set');
  }
  if (!signatureHeader) {
    throw new Error('Missing Shiprocket signature header');
  }
  // TODO: Compute HMAC and compare with signatureHeader value
  return true;
}


