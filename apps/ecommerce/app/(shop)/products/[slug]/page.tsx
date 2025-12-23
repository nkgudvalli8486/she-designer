import { getProductBySlug } from '@/src/lib/products';
import { ProductDetailsClient } from '@/components/product-details-client';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { notFound } from 'next/navigation';

export default async function ProductPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const product: any = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }
  const images: string[] = (product.product_images || []).map((x: any) => x.url as string);
  const priceCents = product.sale_price_cents ?? product.price_cents ?? 0;
  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <div className="container py-6 sm:py-10 px-4 sm:px-6 text-neutral-200">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {/* Product Images */}
        <ProductImageGallery images={images} productName={product.name} />

        {/* Product Details */}
        <ProductDetailsClient
          productId={product.id}
          productName={product.name}
          priceCents={priceCents}
          outOfStock={outOfStock}
          description={product.description}
          sku={product.sku}
          stock={product.stock ?? 0}
        />
      </div>
    </div>
  );
}


