'use client';

import { UserProfile } from './user-profile';
import { useCurrency } from './currency-context';
import { useEffect, useState } from 'react';

export function Topbar() {
  const { currency, setCurrency } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full bg-neutral-900 text-neutral-200 border-b border-neutral-800">
      <div className="container flex h-auto sm:h-10 items-center justify-between text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-0">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <span className="whitespace-nowrap">We ship worldwide</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline whitespace-nowrap">
            For Express Orders Whatsapp us <a href="https://wa.me/916301116707" className="underline">+91-6301116707</a>
          </span>
          <span className="sm:hidden text-[10px]">
            <a href="https://wa.me/916301116707" className="underline">WhatsApp</a>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <UserProfile />
          {mounted && (
            <select
              aria-label="Currency"
              className="rounded bg-neutral-800 px-1.5 sm:px-2 py-1 text-neutral-200 border border-neutral-700 text-xs sm:text-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
}



