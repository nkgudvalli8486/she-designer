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
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('SHIPROCKET_WEBHOOK_SECRET is not set');
  }
  if (!signatureHeader) {
    throw new Error('Missing Shiprocket signature header');
  }
  
  // Compute HMAC SHA256 and compare with signatureHeader
  // Shiprocket typically uses HMAC SHA256 for webhook verification
  try {
    // Use dynamic import for better compatibility
    const crypto = typeof require !== 'undefined' ? require('crypto') : null;
    if (!crypto) {
      // Fallback for environments without Node.js crypto
      // In production, ensure Node.js runtime is used
      console.warn('Crypto module not available, using fallback verification');
      if (signatureHeader === secret) {
        return true;
      }
      throw new Error('Shiprocket webhook verification failed - crypto module unavailable');
    }
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('hex');
    
    // Compare signatures (constant-time comparison to prevent timing attacks)
    const providedSignature = signatureHeader.replace('sha256=', '').trim();
    if (computedSignature.length !== providedSignature.length) {
      throw new Error('Invalid Shiprocket webhook signature');
    }
    
    let match = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      match |= computedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
    }
    
    if (match !== 0) {
      throw new Error('Invalid Shiprocket webhook signature');
    }
    
    return true;
  } catch (err) {
    // If crypto module is not available or signature format is different, 
    // fall back to simple string comparison (less secure but functional for dev)
    if ((err as Error).message.includes('Invalid') || (err as Error).message.includes('verification failed')) {
      throw err;
    }
    // For development/testing, allow if signatures match exactly
    if (process.env.NODE_ENV === 'development' && signatureHeader === secret) {
      console.warn('Using fallback webhook verification in development mode');
      return true;
    }
    throw new Error('Shiprocket webhook verification failed');
  }
}


