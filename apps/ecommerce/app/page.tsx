import Link from 'next/link';
import { Button } from '@nts/ui';
import { HeroCarousel } from '@/components/hero-carousel';
import { CategoryCarousel } from '@/components/category-carousel';

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <section className="relative">
        <HeroCarousel
          images={[
            { src: '/product-carousel/Lehanga I-1.jpeg', alt: 'Lehengas', href: '/collections/lehengas' },
            { src: '/product-carousel/Dress I-8.jpeg', alt: 'Dresses', href: '/collections/dresses' },
            { src: '/product-carousel/Chudidar I-1.jpeg', alt: 'Kids', href: '/collections/kids' },
            { src: '/product-carousel/Saree I-1.jpeg', alt: 'Sarees', href: '/collections/sarees' },
            { src: '/product-carousel/Half Saree I-1.jpeg', alt: 'Half Saree', href: '/collections/half-saree' },
            { src: '/product-carousel/Palazzo I-10.jpeg', alt: 'Palazzo', href: '/collections/palazzo' },
            { src: '/product-carousel/Anarkali I-4.jpeg', alt: 'Anarkali', href: '/collections/anarkali' }
          ]}
          fit="contain"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="pointer-events-auto container">
            <div className="max-w-lg rounded-md bg-background/70 p-6 backdrop-blur">
              <h1 className="text-4xl font-bold tracking-tight">Blush by Mounika</h1>
              <p className="mt-3 text-muted-foreground">
                Premium ethnic wear. Made-to-order options. Mobile-first experience.
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild>
                  <Link href="/collections/new-arrivals">Shop Now</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/collections/lehenga-spotlight">Lehenga Spotlight</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-2xl font-semibold">Shop by Category</h2>
        <div className="mt-6">
          <CategoryCarousel
            items={[
              { label: 'Lehengas', href: '/collections/lehengas', image: '/product-carousel/Lehanga I-1.jpeg' },
              { label: 'Dresses', href: '/collections/dresses', image: '/product-carousel/Dress I-8.jpeg' },
              { label: 'Kids', href: '/collections/kids', image: '/product-carousel/Chudidar I-1.jpeg' },
              { label: 'Sarees', href: '/collections/sarees', image: '/product-carousel/Saree I-1.jpeg' },
              { label: 'Half Saree', href: '/collections/half-saree', image: '/product-carousel/Half Saree I-1.jpeg' },
              { label: 'Palazzo', href: '/collections/palazzo', image: '/product-carousel/Palazzo I-10.jpeg' },
              { label: 'Anarkali', href: '/collections/anarkali', image: '/product-carousel/Anarkali I-4.jpeg' }
            ]}
            autoMs={2500}
          />
        </div>
      </section>
    </main>
  );
}


