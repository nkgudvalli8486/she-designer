'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/src/lib/auth-client';
import { useToast } from '@/components/toast';

export function CartItemControls(props: { productId: string; quantity: number; stock?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  async function update(op: 'inc' | 'dec' | 'set', qty?: number) {
    try {
      setLoading(true);
      
      // Validate stock before increasing
      if (op === 'inc' && props.stock !== undefined) {
        if (props.quantity >= props.stock) {
          error(`Only ${props.stock} item${props.stock === 1 ? '' : 's'} available in stock`);
          return;
        }
      }
      
      // Validate stock when setting quantity
      if (op === 'set' && qty !== undefined && props.stock !== undefined) {
        if (qty > props.stock) {
          error(`Only ${props.stock} item${props.stock === 1 ? '' : 's'} available in stock`);
          return;
        }
      }
      
      const res = await fetch('/api/public/cart', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(op === 'set' ? { productId: props.productId, quantity: qty } : { productId: props.productId, op })
      });
      if (res.ok) {
        success('Cart updated successfully');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart:changed'));
        }
        router.refresh();
      } else if (res.status === 401) {
        router.push('/login?redirect=/cart');
      } else {
        const errorData = await res.json().catch(() => ({}));
        error(errorData.error || 'Failed to update cart. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/cart?productId=${encodeURIComponent(props.productId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        success('Item removed from cart');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart:changed'));
        }
        router.refresh();
      } else if (res.status === 401) {
        router.push('/login?redirect=/cart');
      } else {
        error('Failed to remove item. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-neutral-700">
        <button
          className="h-8 w-8 disabled:opacity-50 text-sm sm:text-base"
          disabled={loading}
          onClick={() => update('dec')}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <div className="px-2 sm:px-3 text-xs sm:text-sm select-none min-w-[2rem] text-center">{props.quantity}</div>
        <button
          className="h-8 w-8 disabled:opacity-50 text-sm sm:text-base"
          disabled={loading || (props.stock !== undefined && props.quantity >= props.stock)}
          onClick={() => update('inc')}
          aria-label="Increase quantity"
          title={props.stock !== undefined && props.quantity >= props.stock ? `Only ${props.stock} available` : undefined}
        >
          +
        </button>
      </div>
      <button
        className="h-8 px-2 sm:px-3 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
        disabled={loading}
        onClick={remove}
      >
        Remove
      </button>
    </div>
  );
}



