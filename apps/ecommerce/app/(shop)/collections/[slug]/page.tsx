import Link from 'next/link';
import { listProductsByCollectionSlug } from '@/src/lib/products';
import { PlpHoverActions } from '@/components/plp-hover-actions';
import { ProductCardPrice } from '@/components/product-card-price';

export default async function CollectionPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const products = await listProductsByCollectionSlug(slug);

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6">
      <h1 className="text-xl sm:text-2xl font-semibold capitalize">{slug.replace(/-/g, ' ')}</h1>
      <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
        {products.length === 0 && (
          <div className="col-span-full text-muted-foreground">No products found.</div>
        )}
        {products.map((p: any) => {
          const img = (p.product_images?.[0]?.url as string) || '';
          const priceCents = p.sale_price_cents ?? p.price_cents ?? 0;
          return (
            <div
              key={p.id}
              className="group rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900 hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-800">
                {img ? <img src={img} alt={p.name} className="h-full w-full object-cover" /> : null}
                <PlpHoverActions productId={p.id} slug={p.slug} />
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
    </div>
  );
}


