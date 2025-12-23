'use client';

import { useState, useEffect } from 'react';
import { AddToCart } from '@/components/add-to-cart';
import { WishlistButton } from '@/components/wishlist-button';
import { ProductPrice } from '@/components/product-price';
import { CustomMeasurements } from '@/components/custom-measurements';

interface ProductDetailsClientProps {
  productId: string;
  productName: string;
  priceCents: number;
  outOfStock: boolean;
  description?: string;
  sku?: string;
  stock?: number;
}

export function ProductDetailsClient({
  productId,
  productName,
  priceCents,
  outOfStock,
  description,
  sku,
  stock
}: ProductDetailsClientProps) {
  const [customMeasurements, setCustomMeasurements] = useState<Record<string, number | string>>({});
  const [hasSizeSelected, setHasSizeSelected] = useState(false);
  const [hasHeightSelected, setHasHeightSelected] = useState(false);

  // Check if both size and height are selected
  useEffect(() => {
    const size = customMeasurements.size;
    const height = customMeasurements.height;
    const hasSize = size !== undefined && size !== '';
    const hasHeight = height !== undefined && height !== '';
    setHasSizeSelected(hasSize);
    setHasHeightSelected(hasHeight);
  }, [customMeasurements]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-100 mb-2">
          {productName}
        </h1>
        <p className="text-xl sm:text-2xl font-semibold text-primary mb-4">
          <ProductPrice priceCents={priceCents} />
        </p>
        {outOfStock && (
          <div className="inline-flex items-center gap-2 rounded-md bg-red-500/20 text-red-400 px-3 py-1 text-sm mb-4">
            Out of Stock
          </div>
        )}
        {description && (
          <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Custom Measurements Accordion */}
      <CustomMeasurements 
        onMeasurementsChange={setCustomMeasurements}
        onSizeSelected={setHasSizeSelected}
        onHeightSelected={setHasHeightSelected}
      />

      {/* Quantity and Add to Cart */}
      <div className="space-y-4">
        <AddToCart 
          productId={productId} 
          disabled={outOfStock || !hasSizeSelected || !hasHeightSelected}
          customMeasurements={customMeasurements}
          stock={stock}
        />
        {(!hasSizeSelected || !hasHeightSelected) && (
          <p className="text-sm text-red-400">
            {!hasSizeSelected && !hasHeightSelected 
              ? 'Please select size and height before adding to cart'
              : !hasSizeSelected 
              ? 'Please select a size before adding to cart'
              : 'Please select a height before adding to cart'}
          </p>
        )}
        <div className="flex items-center gap-4">
          <WishlistButton productId={productId} />
          <button className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
            Add to compare
          </button>
        </div>
      </div>

      {/* SKU */}
      {sku && (
        <div className="pt-4 border-t border-neutral-700">
          <p className="text-sm text-neutral-400">
            <span className="font-medium">SKU:</span> {sku}
          </p>
        </div>
      )}
    </div>
  );
}

