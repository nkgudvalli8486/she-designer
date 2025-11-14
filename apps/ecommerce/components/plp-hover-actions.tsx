'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

export function PlpHoverActions(props: { productId: string; slug: string }) {
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);

  // Initialize 'added' based on current wishlist contents
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/public/wishlist', { cache: 'no-store' });
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
    window.addEventListener('wishlist:changed', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('wishlist:changed', onChanged);
    };
  }, [props.productId]);

  async function addToWishlist() {
    if (saving || added) return;
    try {
      setSaving(true);
      const res = await fetch('/api/public/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: props.productId })
      });
      if (res.ok) {
        setAdded(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('wishlist:changed'));
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    void addToWishlist();
  }

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={handleClick}
        disabled={saving || added}
        className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-pink-600/40 bg-neutral-900/80 text-neutral-100 hover:bg-neutral-900/95 disabled:opacity-60"
        aria-label="Add to wishlist"
        title={added ? 'Wishlisted' : 'Add to wishlist'}
      >
        <Heart size={16} className={added ? 'fill-pink-600 text-pink-600' : 'text-pink-500'} />
      </button>
    </div>
  );
}



