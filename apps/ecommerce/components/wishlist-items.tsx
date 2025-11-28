'use client';

import Link from 'next/link';
import { RemoveFromWishlist } from './remove-from-wishlist';
import { AddToCart } from './add-to-cart';
import { Price } from './price';

interface WishlistItem {
  product_id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
}

interface WishlistItemsProps {
  items: WishlistItem[];
}

export function WishlistItems({ items }: WishlistItemsProps) {
  return (
    <div className="mt-4 sm:mt-6 grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.length === 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          Your wishlist is empty.
        </div>
      )}
      {items.map((it) => (
        <div key={it.product_id} className="rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 hover:shadow-lg transition-shadow">
          <Link href={`/products/${it.slug}`} className="block aspect-[4/3] bg-neutral-800">
            {it.image ? <img src={it.image} alt={it.name || ''} className="h-full w-full object-cover" /> : null}
          </Link>
          <div className="p-2">
            <Link href={`/products/${it.slug}`} className="block font-medium text-neutral-100 line-clamp-2 text-sm">
              {it.name}
            </Link>
            {typeof it.price === 'number' ? (
              <div className="mt-1 text-xs text-neutral-300"><Price amount={it.price} /></div>
            ) : null}
            <div className="mt-3 flex items-center gap-2">
              <AddToCart productId={it.product_id} />
              <RemoveFromWishlist productId={it.product_id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

