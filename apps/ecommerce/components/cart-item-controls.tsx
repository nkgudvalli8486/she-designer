'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CartItemControls(props: { productId: string; quantity: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(op: 'inc' | 'dec' | 'set', qty?: number) {
    try {
      setLoading(true);
      const res = await fetch('/api/public/cart', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(op === 'set' ? { productId: props.productId, quantity: qty } : { productId: props.productId, op })
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart:changed'));
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/cart?productId=${encodeURIComponent(props.productId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart:changed'));
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-neutral-700">
        <button
          className="h-8 w-8 disabled:opacity-50"
          disabled={loading}
          onClick={() => update('dec')}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <div className="px-3 text-sm select-none">{props.quantity}</div>
        <button
          className="h-8 w-8 disabled:opacity-50"
          disabled={loading}
          onClick={() => update('inc')}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        className="h-8 px-3 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50"
        disabled={loading}
        onClick={remove}
      >
        Remove
      </button>
    </div>
  );
}



