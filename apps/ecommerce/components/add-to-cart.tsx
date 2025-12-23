'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/src/lib/auth-client';
import { useToast } from '@/components/toast';

interface AddToCartProps {
  productId: string;
  disabled?: boolean;
  customMeasurements?: Record<string, number | string>;
  showQuantity?: boolean;
  stock?: number;
}

export function AddToCart({ productId, disabled, customMeasurements, showQuantity = true, stock }: AddToCartProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const { success, error } = useToast();

  // Detect if this product is already in the cart
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/public/cart', { cache: 'no-store', headers: getAuthHeaders() });
        const json = await res.json().catch(() => ({ data: [] }));
        const items: Array<{ productId: string }> = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setDone(items.some((it) => it.productId === productId));
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
  }, [productId]);

  const handleAddToCart = async () => {
    if (done) {
      router.push('/cart');
      return;
    }
    
    // Validate that both size and height are selected if custom measurements are provided
    if (customMeasurements) {
      if (!customMeasurements.size) {
        error('Please select a size before adding to cart');
        return;
      }
      if (!customMeasurements.height) {
        error('Please select a height before adding to cart');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      const body: any = {
        productId,
        quantity
      };
      
      // Include custom measurements if provided
      // Size and height are mandatory, custom measurements are optional
      if (customMeasurements && Object.keys(customMeasurements).length > 0) {
        const size = customMeasurements.size;
        const height = customMeasurements.height;
        if (size === undefined || height === undefined) {
          error('Please select size and height before adding to cart');
          return;
        }
        const attributes: Record<string, number | string> = {
          size, // Mandatory
          height // Mandatory
        };
        
        // Add optional custom measurements (only if they have values > 0)
        Object.entries(customMeasurements).forEach(([key, value]) => {
          // Skip size and height as they're already added
          if (key !== 'size' && key !== 'height') {
            // Include if it's a number > 0 or a non-empty string
            if (typeof value === 'number' && value > 0) {
              attributes[key] = value;
            } else if (typeof value === 'string' && value.trim()) {
              attributes[key] = value.trim();
            }
          }
        });
        
        body.attributes = attributes;
      }

      const res = await fetch('/api/public/cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setDone(true);
        success('Item added to cart successfully!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart:changed'));
        }
      } else if (res.status === 401) {
        // Redirect to login if not authenticated
        const currentPath = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        error('Failed to add item to cart. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!showQuantity) {
    // Simple button without quantity selector (for wishlist)
    return (
      <button
        className="h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        disabled={disabled || submitting}
        onClick={handleAddToCart}
        title={disabled ? 'Out of Stock' : undefined}
      >
        {done ? 'Go to cart' : submitting ? 'Adding…' : 'Go to'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Quantity Selector */}
      <div className="flex items-center border border-neutral-600 rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors disabled:opacity-50"
          disabled={quantity <= 1 || submitting}
        >
          -
        </button>
        <input
          type="number"
          min="1"
          max={stock}
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 1;
            const maxQty = stock !== undefined ? Math.min(val, stock) : val;
            setQuantity(Math.max(1, maxQty));
          }}
          className="w-16 px-3 py-2 bg-neutral-800 text-neutral-200 text-center border-x border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => {
            const newQty = stock !== undefined ? Math.min(quantity + 1, stock) : quantity + 1;
            setQuantity(newQty);
          }}
          className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors disabled:opacity-50"
          disabled={submitting || (stock !== undefined && quantity >= stock)}
          title={stock !== undefined && quantity >= stock ? `Only ${stock} available` : undefined}
        >
          +
        </button>
      </div>

      {/* Add to Cart Button */}
      <button
        className="flex-1 h-10 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium transition-colors"
        disabled={disabled || submitting}
        onClick={handleAddToCart}
        title={disabled ? 'Out of Stock' : undefined}
      >
        {done ? 'Go to cart' : submitting ? 'Adding…' : 'ADD TO CART'}
      </button>
    </div>
  );
}


