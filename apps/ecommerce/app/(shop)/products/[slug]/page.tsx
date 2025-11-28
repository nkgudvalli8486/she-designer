import { getProductBySlug } from '@/src/lib/products';
import { AddToCart } from '@/components/add-to-cart';
import { WishlistButton } from '@/components/wishlist-button';
import { ProductPrice } from '@/components/product-price';

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const product: any = await getProductBySlug(slug);

  if (!product) {
    return <div className="container py-10">Product not found.</div>;
  }
  const images: string[] = (product.product_images || []).map((x: any) => x.url as string);
  const priceCents = product.sale_price_cents ?? product.price_cents ?? 0;
  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6">
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        <div className="grid gap-3">
          <div className="aspect-square rounded-lg bg-muted overflow-hidden">
            {images[0] ? <img src={images[0]} alt={product.name} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1, 5).map((src, i) => (
              <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted">
                <img src={src} alt={`${product.name} ${i + 2}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-semibold">{product.name}</h1>
          <p className="text-xl sm:text-2xl"><ProductPrice priceCents={priceCents} /></p>
          {outOfStock && (
            <div className="inline-flex items-center gap-2 rounded-md bg-red-100 px-3 py-1 text-sm text-red-700">
              Out of Stock
            </div>
          )}
          <p className="text-sm sm:text-base text-muted-foreground">{product.description}</p>
          <div className="pt-4 space-y-3">
            <AddToCart productId={product.id} disabled={outOfStock} />
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}


