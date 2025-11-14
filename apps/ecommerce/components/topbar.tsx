'use client';

import Link from 'next/link';

export function Topbar() {
  return (
    <div className="w-full bg-neutral-900 text-neutral-200 border-b border-neutral-800">
      <div className="container flex h-10 items-center justify-between text-xs md:text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span>We ship worldwide</span>
          <span>•</span>
          <span>
            For Express Orders Whatsapp us <a href="https://wa.me/916301116707">+91-6301116707</a>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/account" className="underline underline-offset-2">
            Login / Register
          </Link>
          <select
            aria-label="Currency"
            className="rounded bg-neutral-800 px-2 py-1 text-neutral-200 border border-neutral-700"
            defaultValue="INR"
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
    </div>
  );
}



