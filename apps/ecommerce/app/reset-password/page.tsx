'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/components/toast';

function parseHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

export default function ResetPasswordPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const redirectPath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) return r;
    return '/';
  }, []);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  }, []);

  useEffect(() => {
    // Ensure we have tokens from recovery link
    const params = parseHashParams();
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');

    if (!supabase) {
      error('Supabase env vars are not set');
      return;
    }

    if (!access_token || !refresh_token || type !== 'recovery') {
      error('Invalid or expired reset link. Please request a new one.');
      return;
    }

    // Set session so we can update password
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error: e }) => {
        if (e) error(e.message);
        else setReady(true);
      })
      .catch((e: any) => error(e?.message || 'Failed to initialize reset session'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function submit() {
    if (!supabase) return;
    if (!password || password.length < 6) {
      error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      error('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const { data, error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;

      const accessToken = (await supabase.auth.getSession()).data.session?.access_token;
      if (accessToken) {
        // Create/link customer + issue our app auth cookie so user can use ecommerce immediately
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ accessToken })
        });
      }

      success('Password updated successfully');
      // Hard redirect to ensure cookies are applied
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);

      void data;
    } catch (e: any) {
      error(e?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="max-w-md mx-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-2">Reset password</h2>
        <p className="text-sm text-neutral-400 mb-6">Enter a new password for your account.</p>

        {!ready ? (
          <div className="text-sm text-neutral-400">
            Waiting for reset link…
            <div className="mt-4">
              <Link href="/forgot-password" className="underline underline-offset-2 hover:text-neutral-200">
                Request a new link
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <button
              onClick={submit}
              disabled={loading}
              className="w-full h-10 px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


