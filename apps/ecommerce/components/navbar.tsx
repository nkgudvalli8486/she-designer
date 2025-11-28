'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingCart, Heart, Search, Menu, X, ChevronDown } from 'lucide-react';
import { getAuthHeaders, getAuthTokenClient } from '@/src/lib/auth-client';

const navItems: Array<{ label: string; href: string }> = [
  { label: 'Clothing', href: '/collections/clothing' },
  { label: 'Express Shipping', href: '/collections/express-shipping' },
  { label: 'Là Là Long Dresses', href: '/collections/la-la-long-dresses' },
  { label: 'Casual but Chic!', href: '/collections/casual-but-chic' },
  { label: 'Lehenga Spotlight', href: '/collections/lehenga-spotlight' },
  { label: 'Loom Love', href: '/collections/loom-love' },
  { label: 'Classic Drapes', href: '/collections/classic-drapes' },
  { label: 'The Netted Affair', href: '/collections/the-netted-affair' },
  { label: 'Little MIRAcle', href: '/collections/little-miracle' },
  { label: 'Mom and Mini', href: '/collections/mom-and-mini' }
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [wishCount, setWishCount] = useState(0);
	const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let aborted = false;
    const load = async () => {
      // Only fetch if user is authenticated
      const token = getAuthTokenClient();
      if (!token) {
        if (!aborted) setWishCount(0);
        return;
      }
      try {
        const res = await fetch('/api/public/wishlist', { cache: 'no-store', headers: getAuthHeaders() });
        if (!res.ok) {
          if (!aborted) setWishCount(0);
          return;
        }
        const json = await res.json();
        if (!aborted) setWishCount(Array.isArray(json?.data) ? json.data.length : 0);
      } catch {
        if (!aborted) setWishCount(0);
      }
    };
    load();
    const onChanged = () => load();
    const onAuthChanged = () => {
      // Clear wishlist count on logout
      const token = getAuthTokenClient();
      if (!token) {
        setWishCount(0);
      } else {
        load();
      }
    };
    window.addEventListener('wishlist:changed', onChanged);
    window.addEventListener('auth:changed', onAuthChanged);
    return () => {
      aborted = true;
      window.removeEventListener('wishlist:changed', onChanged);
      window.removeEventListener('auth:changed', onAuthChanged);
    };
  }, []);

	useEffect(() => {
		let aborted = false;
		const loadCart = async () => {
			// Only fetch if user is authenticated
			const token = getAuthTokenClient();
			if (!token) {
				if (!aborted) setCartCount(0);
				return;
			}
			try {
				const res = await fetch('/api/public/cart', { cache: 'no-store', headers: getAuthHeaders() });
				if (!res.ok) {
					if (!aborted) setCartCount(0);
					return;
				}
				const json = await res.json();
				const items: Array<{ quantity?: number }> = Array.isArray(json?.data) ? json.data : [];
				const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
				if (!aborted) setCartCount(total);
			} catch {
				if (!aborted) setCartCount(0);
			}
		};
		loadCart();
		const onCartChanged = () => loadCart();
		const onAuthChanged = () => {
			// Clear cart count on logout
			const token = getAuthTokenClient();
			if (!token) {
				setCartCount(0);
			} else {
				loadCart();
			}
		};
		window.addEventListener('cart:changed', onCartChanged);
		window.addEventListener('auth:changed', onAuthChanged);
		return () => {
			aborted = true;
			window.removeEventListener('cart:changed', onCartChanged);
			window.removeEventListener('auth:changed', onAuthChanged);
		};
	}, []);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60 text-neutral-200">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-700"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="text-xl font-semibold tracking-tight">
            She Designer
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="text-neutral-400 hover:text-white">
            Home
          </Link>
          <div className="relative group">
            <button className="inline-flex items-center gap-1 text-neutral-400 hover:text-white">
              Shop <ChevronDown size={14} />
            </button>
            <div className="invisible absolute left-0 top-full z-40 w-[280px] sm:w-[400px] md:w-[680px] translate-y-2 rounded-md border border-neutral-800 bg-neutral-900 p-4 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {navItems.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href as any}
                    className="rounded-md px-2 py-2 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white"
                  >
                    {i.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="relative group">
            <button className="inline-flex items-center gap-1 text-neutral-400 hover:text-white">
              Accessories <ChevronDown size={14} />
            </button>
            <div className="invisible absolute left-0 top-full z-40 w-[200px] sm:w-[280px] md:w-[360px] translate-y-2 rounded-md border border-neutral-800 bg-neutral-900 p-4 opacity-0 shadow-lg transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="grid grid-cols-1 gap-3">
                {['Jewellery', 'Bags', 'Footwear', 'Dupattas'].map((name) => (
                  <Link
                    key={name}
                    href={`/collections/${name.toLowerCase()}` as any}
                    className="rounded-md px-2 py-2 text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link href={"/gift-card" as any} className="text-neutral-400 hover:text-white">
            Gift Card
          </Link>
          <Link href={"/faqs" as any} className="text-neutral-400 hover:text-white">
            FAQs
          </Link>
          <Link href="/contact" className="text-neutral-400 hover:text-white">
            Contact Us
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700">
            <Search size={18} />
          </button>
          <Link
            href="/wishlist"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700"
            aria-label={`Wishlist${wishCount > 0 ? ` (${wishCount} items)` : ''}`}
          >
            <Heart size={18} />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-pink-600 text-white text-[10px] font-semibold leading-none px-1.5 flex items-center justify-center border-2 border-neutral-900">
                {wishCount > 99 ? '99+' : wishCount}
              </span>
            )}
          </Link>
          <Link
            href="/cart"
				className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700"
            aria-label="Cart"
          >
            <ShoppingCart size={18} />
				{cartCount > 0 ? (
					<span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-pink-600 text-white text-[10px] leading-none px-1 flex items-center justify-center">
						{cartCount > 99 ? '99+' : cartCount}
					</span>
				) : null}
          </Link>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900">
          <div className="container py-3 grid gap-2">
            <Link href="/" className="py-2 text-sm text-neutral-400 hover:text-white" onClick={() => setOpen(false)}>
              Home
            </Link>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href as any}
                className="py-2 text-sm text-neutral-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {['Jewellery', 'Bags', 'Footwear', 'Dupattas'].map((name) => (
              <Link
                key={name}
                href={`/collections/${name.toLowerCase()}` as any}
                className="py-2 text-sm text-neutral-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {name}
              </Link>
            ))}
            <Link href={"/gift-card" as any} className="py-2 text-sm text-neutral-400 hover:text-white" onClick={() => setOpen(false)}>
              Gift Card
            </Link>
            <Link href={"/faqs" as any} className="py-2 text-sm text-neutral-400 hover:text-white" onClick={() => setOpen(false)}>
              FAQs
            </Link>
            <Link href="/contact" className="py-2 text-sm text-neutral-400 hover:text-white" onClick={() => setOpen(false)}>
              Contact Us
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}


