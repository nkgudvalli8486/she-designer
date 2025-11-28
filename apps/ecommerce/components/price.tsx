'use client';

import { useCurrency } from './currency-context';
import { useEffect, useState, useCallback } from 'react';

interface PriceProps {
  amount: number; // Amount in INR (cents or rupees)
  isCents?: boolean; // If true, amount is in cents, otherwise in rupees
  className?: string;
}

export function Price({ amount, isCents = false, className = '' }: PriceProps) {
  const { formatPrice, currency } = useCurrency();
  const [displayPrice, setDisplayPrice] = useState('');

  const updatePrice = useCallback(() => {
    // Convert cents to rupees if needed
    const priceInINR = isCents ? amount / 100 : amount;
    setDisplayPrice(formatPrice(priceInINR));
  }, [amount, isCents, formatPrice]);

  useEffect(() => {
    updatePrice();
  }, [updatePrice, currency]);

  // Listen for currency changes
  useEffect(() => {
    const handleCurrencyChange = () => {
      updatePrice();
    };

    window.addEventListener('currency:changed', handleCurrencyChange);
    return () => window.removeEventListener('currency:changed', handleCurrencyChange);
  }, [updatePrice]);

  return <span className={className}>{displayPrice}</span>;
}

