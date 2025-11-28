import Link from 'next/link';
import { Button } from '@nts/ui';
import { HeroCarousel } from '@/components/hero-carousel';

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
        <div className="pointer-events-none absolute inset-0 flex items-center px-4">
          <div className="pointer-events-auto container">
            <div className="max-w-lg rounded-md bg-background/70 p-4 sm:p-6 backdrop-blur">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">She Designer</h1>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">
                Premium ethnic wear. Made-to-order options. Mobile-first experience.
              </p>
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/collections/new-arrivals">Shop Now</Link>
                </Button>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/collections/lehenga-spotlight">Lehenga Spotlight</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-8 sm:py-12 px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-semibold">Shop by Category</h2>
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 lg:gap-3">
          {[
            { label: 'Lehengas', href: '/collections/lehengas', image: '/product-carousel/Lehanga I-1.jpeg' },
            { label: 'Dresses', href: '/collections/dresses', image: '/product-carousel/Dress I-8.jpeg' },
            { label: 'Chudidar', href: '/collections/chudidar', image: '/product-carousel/Chudidar I-1.jpeg' },
            { label: 'Sarees', href: '/collections/sarees', image: '/product-carousel/Saree I-1.jpeg' },
            { label: 'Half Saree', href: '/collections/half-saree', image: '/product-carousel/Half Saree I-1.jpeg' },
            { label: 'Palazzo', href: '/collections/palazzo', image: '/product-carousel/Palazzo I-10.jpeg' },
            { label: 'Anarkali', href: '/collections/anarkali', image: '/product-carousel/Anarkali I-4.jpeg' }
          ].map((it) => (
            <Link
              key={it.href}
              href={it.href as any}
              className="text-center"
            >
              <div className="mx-auto size-24 sm:size-28 md:size-32 lg:size-24 xl:size-28 rounded-full overflow-hidden ring-1 ring-neutral-700 bg-neutral-800">
                <img
                  src={it.image}
                  alt={it.label}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-2 text-xs sm:text-sm text-neutral-200">{it.label}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}


