'use client';

import { CartItemControls } from './cart-item-controls';
import Link from 'next/link';
import { Price } from './price';

interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartItemsProps {
  items: CartItem[];
  subtotal: number;
}

export function CartItems({ items, subtotal }: CartItemsProps) {
  return (
    <>
      <div className="md:col-span-2 space-y-4">
        {items.length === 0 && <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">Your cart is empty.</div>}
        {items.map((it) => (
          <div key={it.productId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <Link href={`/products/${it.slug}`} className="flex items-center gap-4 min-w-0 flex-1">
              <div className="size-16 sm:size-20 rounded bg-neutral-800 overflow-hidden shrink-0">
                {it.image ? <img src={it.image} alt={it.name || ''} className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-sm sm:text-base">{it.name}</div>
                <div className="text-xs sm:text-sm text-neutral-400"><Price amount={it.price} /></div>
              </div>
            </Link>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              <CartItemControls productId={it.productId} quantity={it.quantity} />
              <div className="text-sm sm:text-base font-medium"><Price amount={it.price * it.quantity} /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6 h-fit space-y-3">
        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
        <div className="flex items-center justify-between text-sm sm:text-base">
          <span>Subtotal</span>
          <span><Price amount={subtotal} /></span>
        </div>
        <Link
          href={items.length > 0 ? '/checkout' : '#'}
          className={`h-10 w-full inline-flex items-center justify-center rounded-md text-primary-foreground text-sm sm:text-base ${items.length > 0 ? 'bg-primary' : 'bg-neutral-800 cursor-not-allowed'}`}
          aria-disabled={items.length === 0}
        >
          Proceed to checkout
        </Link>
      </div>
    </>
  );
}

