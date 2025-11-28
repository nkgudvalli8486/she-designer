import { NextResponse } from 'next/server';

// Cache exchange rate for 1 hour
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached rate if still valid
    if (cachedRate && (now - cachedRate.timestamp < CACHE_DURATION)) {
      return NextResponse.json({ 
        rate: cachedRate.rate,
        cached: true 
      });
    }

    // Fetch fresh rate from API
    // Using exchangerate-api.com (free, no API key required)
    // You can replace this with other APIs like:
    // - exchangeratesapi.io (requires API key)
    // - fixer.io (requires API key)
    // - currencyapi.net (requires API key)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();
    const inrRate = data.rates?.INR;

    if (!inrRate || typeof inrRate !== 'number') {
      throw new Error('Invalid exchange rate data');
    }

    // Cache the rate
    cachedRate = {
      rate: inrRate,
      timestamp: now
    };

    return NextResponse.json({ 
      rate: inrRate,
      cached: false 
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Return cached rate even if expired, or fallback to default
    if (cachedRate) {
      return NextResponse.json({ 
        rate: cachedRate.rate,
        cached: true,
        error: 'Using cached rate due to API error'
      });
    }

    // Fallback to default rate
    return NextResponse.json({ 
      rate: 83, // Default fallback
      cached: false,
      error: 'Using default rate due to API error'
    }, { status: 200 });
  }
}

