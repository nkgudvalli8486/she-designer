'use client';

import { Price } from './price';

interface ProductCardPriceProps {
  priceCents: number;
  className?: string;
}

export function ProductCardPrice({ priceCents, className = '' }: ProductCardPriceProps) {
  return <Price amount={priceCents} isCents={true} className={className} />;
}

