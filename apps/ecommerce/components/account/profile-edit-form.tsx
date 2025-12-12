'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/src/lib/auth-client';
import { useToast } from '@/components/toast';

interface ProfileEditFormProps {
  initialData: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export function ProfileEditForm({ initialData }: ProfileEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || ''
  });
  const { success, error: showError } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg = json.error || 'Failed to update profile';
        setError(errorMsg);
        showError(errorMsg);
        return;
      }

      success('Profile updated successfully!');
      // Trigger auth change event to update user profile in topbar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:changed'));
      }
      setTimeout(() => {
        router.push('/account');
        router.refresh();
      }, 1000);
    } catch (err) {
      const errorMsg = 'An error occurred. Please try again.';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && (
        <div className="rounded-md bg-red-900/50 border border-red-800 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm text-neutral-400">Phone Number</label>
        <input
          type="tel"
          value={initialData.phone || ''}
          disabled
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-300 disabled:opacity-50"
        />
        <p className="text-xs text-neutral-500">Phone number cannot be changed</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm text-neutral-400">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
          placeholder="Enter your name"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm text-neutral-400">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200"
          placeholder="Enter your email"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/account')}
          className="w-full sm:w-auto px-4 py-2 rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

