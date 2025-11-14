'use client';

import { useEffect, useState } from 'react';

export function WishlistButton(props: { productId: string }) {
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);

  // On mount, detect if this product is already in the wishlist for the current session
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/public/wishlist', { cache: 'no-store' });
        const json = await res.json().catch(() => ({ data: [] }));
        const rows: Array<{ product_id: string }> = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setAdded(rows.some(r => r.product_id === props.productId));
        }
      } catch {
        // ignore
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

  return (
    <button
      className="h-10 px-4 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50"
      disabled={saving || added}
      onClick={async () => {
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
      }}
    >
      {added ? 'Wishlisted' : saving ? 'Adding…' : 'Add to wishlist'}
    </button>
  );
}


