'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Search, Menu, X, ChevronDown, Loader2 } from 'lucide-react';
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [wishCount, setWishCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle search input changes
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery);
      }, 300); // Debounce for 300ms
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        throw new Error('Search failed');
      }
      const json = await res.json();
      setSearchResults(Array.isArray(json?.data) ? json.data.slice(0, 6) : []); // Limit to 6 results
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 3) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleCategoryClick = (slug: string) => {
    router.push(`/collections/${slug}`);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60 text-neutral-200">
      <div className="container flex h-16 items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
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
        
        {/* Nav Links - Hidden on mobile, visible on lg+ */}
        <nav className="hidden lg:flex items-center gap-6 text-sm flex-shrink-0">
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
        
        {/* Search Bar - Always Visible in Center */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-400" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more"
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent"
              />
              {isSearching && (
                <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 animate-spin" size={16} />
              )}
            </div>
            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <div className="absolute top-full mt-1 text-xs text-neutral-500 px-2">Enter at least 3 characters</div>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900 shadow-lg max-h-[400px] overflow-y-auto z-50">
                {searchResults.map((category: any) => {
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.slug)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-neutral-200 line-clamp-1">{category.name}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">Category</div>
                      </div>
                    </button>
                  );
                })}
                {searchQuery.length >= 3 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="block w-full p-3 text-center text-sm text-pink-600 hover:bg-neutral-800 border-t border-neutral-800"
                  >
                    View all results
                  </Link>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <Link
            href="/wishlist"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 hover:bg-neutral-800 transition-colors"
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
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 hover:bg-neutral-800 transition-colors"
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
            <div className="relative mb-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-10 py-2 rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-600"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 animate-spin" size={18} />
                )}
              </form>
              {searchResults.length > 0 && (
                <div className="mt-2 rounded-md border border-neutral-800 bg-neutral-900 shadow-lg max-h-[300px] overflow-y-auto">
                  {searchResults.map((category: any) => {
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          handleCategoryClick(category.slug);
                          setOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-neutral-200 line-clamp-1">{category.name}</div>
                          <div className="text-xs text-neutral-400 mt-0.5">Category</div>
                        </div>
                      </button>
                    );
                  })}
                  {searchQuery.length >= 3 && (
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={() => {
                        setOpen(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="block w-full p-3 text-center text-sm text-pink-600 hover:bg-neutral-800 border-t border-neutral-800"
                    >
                      View all results
                    </Link>
                  )}
                </div>
              )}
            </div>
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


