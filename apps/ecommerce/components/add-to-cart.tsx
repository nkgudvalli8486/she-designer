'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AddToCart(props: { productId: string; disabled?: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  // Detect if this product is already in the cart
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/public/cart', { cache: 'no-store' });
        const json = await res.json().catch(() => ({ data: [] }));
        const items: Array<{ productId: string }> = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setDone(items.some((it) => it.productId === props.productId));
        }
      } catch {
        // ignore errors
      }
    };
    check();
    const onChanged = () => check();
    if (typeof window !== 'undefined') {
      window.addEventListener('cart:changed', onChanged);
    }
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('cart:changed', onChanged);
      }
    };
  }, [props.productId]);
  return (
    <button
      className="h-10 px-4 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={props.disabled || submitting}
      onClick={async () => {
        if (done) {
          router.push('/cart');
          return;
        }
        try {
          setSubmitting(true);
          const res = await fetch('/api/public/cart', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ productId: props.productId, quantity: 1 })
          });
          if (res.ok) {
            setDone(true);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('cart:changed'));
            }
          }
        } finally {
          setSubmitting(false);
        }
      }}
      title={props.disabled ? 'Out of Stock' : undefined}
    >
      {done ? 'Go to cart' : submitting ? 'Adding…' : 'Add to cart'}
    </button>
  );
}


