'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      // Store dev OTP if provided (for development mode)
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^[0-9]{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }
      // Success - trigger auth change event and redirect
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:changed'));
        // Force a full page reload to ensure cookies are available
        window.location.href = '/';
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Login with Mobile</h2>
      {error && <div className="mb-4 p-3 rounded-md bg-red-900/50 text-red-200 text-sm">{error}</div>}
      
      {step === 'phone' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mobile Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
              disabled={loading}
            />
          </div>
          <button
            onClick={handleSendOTP}
            disabled={loading || phone.length !== 10}
            className="w-full h-10 px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              maxLength={6}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-neutral-400">OTP sent to +91 {phone}. Please check your mobile.</p>
            {devOtp && (
              <div className="mt-3 p-3 rounded-md bg-yellow-900/30 border border-yellow-800">
                <p className="text-xs text-yellow-200 font-medium mb-1">Development Mode</p>
                <p className="text-sm text-yellow-100">Your OTP is: <span className="font-mono font-bold text-lg">{devOtp}</span></p>
                <p className="text-xs text-yellow-300/70 mt-1">In production with SMS configured, this will be sent via SMS</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
                setDevOtp(null);
              }}
              disabled={loading}
              className="flex-1 h-10 px-4 rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200"
            >
              Change Number
            </button>
            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              className="flex-1 h-10 px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

