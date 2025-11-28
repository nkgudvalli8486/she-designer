import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';
import { sendCompanyEmail } from '@/src/lib/email';

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1).max(5000)
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = ContactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  try {
    const companyName = process.env.COMPANY_NAME || 'She Designer';
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from('contact_messages').insert({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      subject: data.subject ?? null,
      message: data.message
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const to = process.env.COMPANY_EMAIL_TO || process.env.NEXT_PUBLIC_COMPANY_EMAIL_TO || '';
    if (to) {
      const html = `<p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone || '')}</p>
        <p><strong>Subject:</strong> ${escapeHtml(data.subject || '')}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(data.message).replace(/\n/g, '<br/>')}</p>`;
      await sendCompanyEmail({
        to,
        subject: `${data.subject || 'New contact message'} — ${data.name}`,
        html,
        text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || ''}\nSubject: ${data.subject || ''}\n\n${data.message}`,
        fromName: companyName,
        fromEmail: data.email // set as Reply-To so staff can respond directly
      }).catch((err) => {
        console.warn('Email send failed', err);
      });
    }

    // Space out requests to avoid rate limits
    await new Promise((r) => setTimeout(r, 750));

    // Auto-reply to the user (acknowledgement within 20 minutes)
    try {
      const replyHtml = `<p>Hi ${escapeHtml(data.name)},</p>
        <p>Thanks for contacting ${escapeHtml(companyName)}. We’ve received your message and our team will get back to you within 20 minutes.</p>
        <p>Summary:</p>
        <ul>
          <li><strong>Subject:</strong> ${escapeHtml(data.subject || 'General')}</li>
          <li><strong>Phone:</strong> ${escapeHtml(data.phone || 'N/A')}</li>
        </ul>
        <p>Your message:</p>
        <blockquote>${escapeHtml(data.message).replace(/\n/g, '<br/>')}</blockquote>
        <p>Warm regards,<br/>${escapeHtml(companyName)} Support</p>`;
      await sendCompanyEmail({
        to: data.email,
        subject: `Thanks for reaching out to ${companyName} — we’ll reply within 20 minutes`,
        html: replyHtml,
        text: `Hi ${data.name},\n\nThanks for contacting ${companyName}. We’ve received your message and will get back to you within 20 minutes.\n\nSubject: ${data.subject || 'General'}\nPhone: ${data.phone || 'N/A'}\n\n${data.message}\n\n— ${companyName} Support`,
        fromName: companyName
      }).catch((err) => {
        console.warn('Auto-reply send failed', err);
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


