'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/toast';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const redirectPath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) return r;
    return '/';
  }, []);

  async function submit() {
    if (!email || !email.includes('@')) {
      error('Please enter a valid email');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to send reset email');
      success('Password reset email sent. Please check your inbox.');
    } catch (e: any) {
      error(e?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-2">Forgot password</h2>
      <p className="text-sm text-neutral-400 mb-6">We’ll send you a link to reset your password.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full h-10 px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>

        <div className="text-xs text-neutral-400">
          <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="underline underline-offset-2 hover:text-neutral-200">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}


