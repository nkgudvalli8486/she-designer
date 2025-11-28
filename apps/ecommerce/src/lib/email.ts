export async function sendCompanyEmail(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  fromName?: string;
  fromEmail?: string; // used as reply-to
  fromAddress?: string; // optional explicit from address
}) {
  const apiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
  if (!apiKey) {
    // Fallback: no email configured; log and return
    console.warn('RESEND_API_KEY not set - skipping email send');
    return { ok: false, skipped: true };
  }
  const companyName = process.env.COMPANY_NAME || 'She Designer';
  // Resolve a dev-friendly default sender for local use
  const isProd = process.env.NODE_ENV === 'production';
  const defaultFromAddr =
    options.fromAddress ||
    process.env.FORCE_FROM_EMAIL || // testing override
    process.env.COMPANY_EMAIL_FROM ||
    process.env.RESEND_FROM ||
    (!isProd ? 'onboarding@resend.dev' : 'no-reply@example.com');
  const from = `${options.fromName || companyName} <${defaultFromAddr}>`;
  // Testing override to force all emails to a single inbox (e.g., harvar264@gmail.com)
  const forcedTo = process.env.FORCE_TO_EMAIL;
  const payload = {
    from,
    to: [forcedTo || options.to],
    subject: options.subject,
    html: options.html || undefined,
    text: options.text || undefined,
    reply_to: options.fromEmail || undefined
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    // Handle simple rate-limit with one retry after delay
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('retry-after');
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 700;
      await new Promise((r) => setTimeout(r, Number.isFinite(retryAfterMs) ? retryAfterMs : 700));
      const resRetry = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!resRetry.ok) {
        const msgRetry = await resRetry.text().catch(() => '');
        throw new Error(`Resend email failed: ${resRetry.status} ${msgRetry}`);
      }
      return await resRetry.json().catch(() => ({ ok: true }));
    }
    // If domain not verified and we're not in production, retry with onboarding@resend.dev
    if (!isProd && /domain is not verified/i.test(msg)) {
      const retry = {
        ...payload,
        from: `${options.fromName || companyName} <onboarding@resend.dev>`
      };
      const res2 = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(retry)
      });
      if (!res2.ok) {
        const msg2 = await res2.text().catch(() => '');
        throw new Error(`Resend email failed: ${res2.status} ${msg2}`);
      }
      return await res2.json().catch(() => ({ ok: true }));
    }
    throw new Error(`Resend email failed: ${res.status} ${msg}`);
  }
  return await res.json().catch(() => ({ ok: true }));
}


