'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlpHoverActions } from '@/components/plp-hover-actions';
import { ProductCardPrice } from '@/components/product-card-price';
import { Search, Loader2 } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const searchQuery = searchParams.get('q') || '';
    setQuery(searchQuery);
    if (searchQuery && searchQuery.length >= 3) {
      performSearch(searchQuery);
    } else {
      setProducts([]);
      setHasSearched(false);
    }
  }, [searchParams]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 3) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) {
        throw new Error('Search failed');
      }
      const json = await res.json();
      setProducts(Array.isArray(json?.data) ? json.data : []);
    } catch (error) {
      console.error('Search error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 3) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products (minimum 3 characters)..."
            className="w-full pl-10 pr-4 py-3 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-600 focus:border-transparent"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 animate-spin" size={20} />
          )}
        </div>
      </form>

      {query.length > 0 && query.length < 3 && (
        <div className="text-muted-foreground text-sm">
          Please enter at least 3 characters to search.
        </div>
      )}

      {hasSearched && !loading && (
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold">
            {products.length > 0
              ? `Found ${products.length} ${products.length === 1 ? 'product' : 'products'} for "${query}"`
              : `No products found for "${query}"`}
          </h1>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-neutral-400" size={32} />
        </div>
      )}

      {!loading && hasSearched && products.length === 0 && query.length >= 3 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No products found matching your search.</p>
          <p className="mt-2 text-sm">Try different keywords or check your spelling.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {products.map((p: any) => {
            const img = (p.product_images?.[0]?.url as string) || '';
            const priceCents = p.sale_price_cents ?? p.price_cents ?? 0;
            const outOfStock = (p.stock ?? 0) <= 0;
            return (
              <div
                key={p.id}
                className="group rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-800">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className={`h-full w-full object-cover ${outOfStock ? 'opacity-60 grayscale' : ''}`}
                    />
                  ) : null}
                  <PlpHoverActions productId={p.id} slug={p.slug} />
                  {outOfStock && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/55">
                      <span className="rounded-md bg-black/60 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  <Link href={`/products/${p.slug}`} className="absolute inset-0 z-0" aria-label={p.name} />
                </div>
                <div className="p-2 sm:p-3">
                  <div className="font-medium line-clamp-2 text-xs sm:text-sm">{p.name}</div>
                  <div className="mt-1 text-xs text-neutral-300"><ProductCardPrice priceCents={priceCents} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasSearched && query.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Enter a search query to find products.</p>
          <p className="mt-2 text-sm">Search by product name or description (minimum 3 characters).</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container py-6 sm:py-10 px-4 sm:px-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-neutral-400" size={32} />
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

