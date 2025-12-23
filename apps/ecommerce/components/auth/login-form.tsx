'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/toast';
import Link from 'next/link';

export function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { success, error: showError } = useToast();

  const redirectPath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get('redirect');
    if (r && r.startsWith('/') && !r.startsWith('//')) return r;
    return '/';
  }, []);

  useEffect(() => {
    // Prefill error message from callback redirect (optional)
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const err = sp.get('error');
    if (err) {
      const msg = decodeURIComponent(err);
      setError(msg);
    }
  }, []);

  const handleEmailAuth = async () => {
    if (!email || !email.includes('@')) {
      const errorMsg = 'Please enter a valid email address';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }
    if (!password || password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      // Success - trigger auth change event and redirect
      success(mode === 'signup' ? 'Account created!' : 'Login successful!');
      window.dispatchEvent(new Event('auth:changed'));
      // Force a full page reload to ensure cookies are available (also avoids typedRoutes issues)
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 500);
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-2">Login</h2>
      <p className="text-sm text-neutral-400 mb-4 sm:mb-6">Sign in with Email</p>
      {error && <div className="mb-4 p-3 rounded-md bg-red-900/50 text-red-200 text-sm">{error}</div>}

      <div className="space-y-3">
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
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
            disabled={loading}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
              className="underline underline-offset-2 hover:text-neutral-200"
            >
              {mode === 'signin' ? 'Create an account' : 'I already have an account'}
            </button>
            {mode === 'signin' && (
              <Link href={`/forgot-password?redirect=${encodeURIComponent(redirectPath)}`} className="underline underline-offset-2 hover:text-neutral-200">
                Forgot password?
              </Link>
            )}
          </div>
        </div>

        <button
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full h-10 px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Login'}
        </button>
      </div>
    </div>
  );
}

