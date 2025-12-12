'use client';

import * as React from 'react';
import { useToast } from '@/components/toast';

export function ContactForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const { success, error } = useToast();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      subject: String(formData.get('subject') || ''),
      message: String(formData.get('message') || '')
    };
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        form.reset();
        setResult(null);
        success('Thanks! Your message has been sent.');
      } else {
        const j = await res.json().catch(() => ({}));
        const errorMsg = j?.error || 'Something went wrong. Please try again.';
        setResult(errorMsg);
        error(errorMsg);
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      setResult(errorMsg);
      error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 sm:mt-6 max-w-2xl mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Name</label>
          <input name="name" required className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Email</label>
          <input type="email" name="email" required className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Phone (optional)</label>
          <input name="phone" className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-neutral-400">Subject</label>
          <input name="subject" className="h-10 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-neutral-100" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm text-neutral-400">Message</label>
        <textarea name="message" required rows={6} className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-100" />
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <button disabled={submitting} className="h-10 w-full sm:w-auto px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
        {result && <span className="text-sm text-neutral-300 text-center sm:text-left">{result}</span>}
      </div>
    </form>
  );
}


