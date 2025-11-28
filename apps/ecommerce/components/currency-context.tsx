'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Currency = 'INR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInINR: number) => number;
  formatPrice: (priceInINR: number) => string;
  getCurrencySymbol: () => string;
  exchangeRate: number;
  isLoadingRate: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default fallback exchange rate (1 USD = 83 INR)
const DEFAULT_EXCHANGE_RATE = 83;
const CACHE_KEY = 'exchange_rate_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

async function fetchExchangeRate(): Promise<number> {
  try {
    // Try to fetch from our API route first (server-side, can use API keys securely)
    try {
      const apiResponse = await fetch('/api/public/exchange-rate', {
        cache: 'no-store'
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        if (apiData.rate && typeof apiData.rate === 'number') {
          return apiData.rate;
        }
      }
    } catch (apiError) {
      console.warn('API route failed, trying direct API:', apiError);
    }

    // Fallback to direct API call (client-side)
    // Using exchangerate-api.com (free, no API key required for basic usage)
    // Alternative: You can use other APIs like exchangeratesapi.io, fixer.io, etc.
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }
    
    const data = await response.json();
    // Get INR rate (1 USD = X INR)
    const inrRate = data.rates?.INR;
    
    if (!inrRate || typeof inrRate !== 'number') {
      throw new Error('Invalid exchange rate data');
    }
    
    return inrRate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Fallback to default rate
    return DEFAULT_EXCHANGE_RATE;
  }
}

function getCachedRate(): ExchangeRateCache | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: ExchangeRateCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (less than 1 hour old)
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

function setCachedRate(rate: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache: ExchangeRateCache = {
      rate,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore localStorage errors
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency') as Currency | null;
    if (savedCurrency === 'INR' || savedCurrency === 'USD') {
      setCurrencyState(savedCurrency);
    }
  }, []);

  // Fetch exchange rate on mount
  useEffect(() => {
    let mounted = true;

    async function loadExchangeRate() {
      setIsLoadingRate(true);
      
      // Try to get cached rate first
      const cached = getCachedRate();
      if (cached) {
        if (mounted) {
          setExchangeRate(cached.rate);
          setIsLoadingRate(false);
        }
        return;
      }

      // Fetch fresh rate from API
      const rate = await fetchExchangeRate();
      
      if (mounted) {
        setExchangeRate(rate);
        setIsLoadingRate(false);
        setCachedRate(rate);
      }
    }

    loadExchangeRate();

    return () => {
      mounted = false;
    };
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);
    // Dispatch event to update all price displays
    window.dispatchEvent(new CustomEvent('currency:changed', { detail: { currency: newCurrency } }));
  };

  const convertPrice = useCallback((priceInINR: number): number => {
    if (currency === 'USD') {
      return priceInINR / exchangeRate;
    }
    return priceInINR;
  }, [currency, exchangeRate]);

  const formatPrice = useCallback((priceInINR: number): string => {
    const convertedPrice = convertPrice(priceInINR);
    if (currency === 'USD') {
      return `$${convertedPrice.toFixed(2)}`;
    }
    return `₹${convertedPrice.toFixed(0)}`;
  }, [currency, convertPrice]);

  const getCurrencySymbol = (): string => {
    return currency === 'USD' ? '$' : '₹';
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convertPrice,
        formatPrice,
        getCurrencySymbol,
        exchangeRate,
        isLoadingRate
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

