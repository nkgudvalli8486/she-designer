'use client';

import { Price } from './price';

interface ProductPriceProps {
  priceCents: number;
  className?: string;
}

export function ProductPrice({ priceCents, className = '' }: ProductPriceProps) {
  return <Price amount={priceCents} isCents={true} className={className} />;
}

