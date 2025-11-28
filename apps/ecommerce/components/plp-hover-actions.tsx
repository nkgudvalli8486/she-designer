'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { getAuthHeaders, getAuthTokenClient } from '@/src/lib/auth-client';

export function PlpHoverActions(props: { productId: string; slug: string }) {
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);

  // Initialize 'added' based on current wishlist contents
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // Only check if user is authenticated
      const token = getAuthTokenClient();
      if (!token) {
        if (!cancelled) setAdded(false);
        return;
      }
      try {
        const res = await fetch('/api/public/wishlist', { 
          cache: 'no-store',
          headers: getAuthHeaders()
        });
        const json = await res.json().catch(() => ({ data: [] }));
        const rows: Array<{ product_id: string }> = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setAdded(rows.some((r) => r.product_id === props.productId));
        }
      } catch {
        // ignore errors
      }
    };
    check();
    const onChanged = () => check();
    const onAuthChanged = () => {
      const token = getAuthTokenClient();
      if (!token) {
        setAdded(false);
      } else {
        check();
      }
    };
    window.addEventListener('wishlist:changed', onChanged);
    window.addEventListener('auth:changed', onAuthChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('wishlist:changed', onChanged);
      window.removeEventListener('auth:changed', onAuthChanged);
    };
  }, [props.productId]);

  async function toggleWishlist() {
    if (saving) return;
    const token = getAuthTokenClient();
    if (!token) {
      // Redirect to login if not authenticated
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    try {
      setSaving(true);
      if (added) {
        // Remove from wishlist
        const res = await fetch(`/api/public/wishlist?productId=${encodeURIComponent(props.productId)}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          setAdded(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('wishlist:changed'));
          }
        } else if (res.status === 401) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      } else {
        // Add to wishlist
        const res = await fetch('/api/public/wishlist', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ productId: props.productId })
        });
        if (res.ok) {
          setAdded(true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('wishlist:changed'));
          }
        } else if (res.status === 401) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    void toggleWishlist();
  }

  return (
    <div className={`pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-2 transition-opacity ${added ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      <button
        onClick={handleClick}
        disabled={saving}
        className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-pink-600/40 bg-neutral-900/80 text-neutral-100 hover:bg-neutral-900/95 disabled:opacity-60"
        aria-label={added ? 'Remove from wishlist' : 'Add to wishlist'}
        title={added ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={16} className={added ? 'fill-pink-600 text-pink-600' : 'text-pink-500'} />
      </button>
    </div>
  );
}



