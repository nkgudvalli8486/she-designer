'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RemoveFromWishlist } from './remove-from-wishlist';
import { AddToCart } from './add-to-cart';
import { Price } from './price';
import { SizeSelectionModal } from './size-selection-modal';
import { useToast } from './toast';
import { getAuthHeaders } from '@/src/lib/auth-client';
import { useRouter } from 'next/navigation';

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
  const [selectedProduct, setSelectedProduct] = useState<WishlistItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { success, error } = useToast();
  const router = useRouter();

  const handleAddToCartClick = (item: WishlistItem) => {
    setSelectedProduct(item);
    setIsModalOpen(true);
  };

  const handleSizeSelected = async (measurements: Record<string, number | string>) => {
    if (!selectedProduct) return;

    try {
      const body: any = {
        productId: selectedProduct.product_id,
        quantity: 1
      };

      // Include all measurements in attributes
      if (measurements && Object.keys(measurements).length > 0) {
        body.attributes = measurements;
      }

      const res = await fetch('/api/public/cart', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        success('Item added to cart successfully!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart:changed'));
        }
      } else if (res.status === 401) {
        const currentPath = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else {
        error('Failed to add item to cart. Please try again.');
      }
    } catch (err) {
      error('Failed to add item to cart. Please try again.');
    }
  };

  return (
    <>
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
                <button
                  onClick={() => handleAddToCartClick(it)}
                  className="flex-1 h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                >
                  Move to Bag
                </button>
                <RemoveFromWishlist productId={it.product_id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedProduct && (
        <SizeSelectionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.product_id}
          productName={selectedProduct.name}
          onSizeSelected={handleSizeSelected}
        />
      )}
    </>
  );
}

