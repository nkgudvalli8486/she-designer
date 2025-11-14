'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Slide = { src: string; alt?: string; href?: string };
type HeroCarouselProps = {
	images: Array<Slide>;
	intervalMs?: number;
	fit?: 'cover' | 'contain';
};

export function HeroCarousel({ images, intervalMs = 5000, fit = 'cover' }: HeroCarouselProps) {
	const [emblaRef, emblaApi] = useEmblaCarousel(
		{ loop: true, align: 'start', skipSnaps: false },
		[Autoplay({ delay: intervalMs, stopOnInteraction: false, stopOnMouseEnter: true })]
	);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
	const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
		setScrollSnaps(emblaApi.scrollSnapList());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		emblaApi.on('select', onSelect);
		emblaApi.on('reInit', onSelect);
	}, [emblaApi, onSelect]);

	const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
	const scrollTo = useCallback((i: number) => emblaApi && emblaApi.scrollTo(i), [emblaApi]);

	if (!images?.length) return null;

	return (
		<section className="relative">
			<div className="overflow-hidden rounded-none md:rounded-xl" ref={emblaRef}>
				<div className="flex">
					{images.map((img, i) => (
						<div className="relative min-w-0 flex-[0_0_100%]" key={`${img.src}-${i}`}>
							<div className="relative w-full aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5] bg-muted">
								{img.href ? (
									<Link href={img.href} aria-label={img.alt ?? 'Banner'}>
										<img
											src={img.src}
											alt={img.alt ?? 'Banner'}
											loading={i === 0 ? 'eager' : 'lazy'}
											decoding="async"
											className={`h-full w-full ${fitClass} bg-black`}
										/>
									</Link>
								) : (
									<img
										src={img.src}
										alt={img.alt ?? 'Banner'}
										loading={i === 0 ? 'eager' : 'lazy'}
										decoding="async"
										className={`h-full w-full ${fitClass} bg-black`}
									/>
								)}
							</div>
						</div>
					))}
				</div>
			</div>

			<button
				type="button"
				onClick={scrollPrev}
				className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-black/30 text-white p-2 backdrop-blur hover:bg-black/50"
				aria-label="Previous slide"
			>
				<ChevronLeft />
			</button>
			<button
				type="button"
				onClick={scrollNext}
				className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-black/30 text-white p-2 backdrop-blur hover:bg-black/50"
				aria-label="Next slide"
			>
				<ChevronRight />
			</button>

			<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
				{scrollSnaps.map((_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => scrollTo(i)}
						className={`h-2 w-2 rounded-full ${i === selectedIndex ? 'bg-white' : 'bg-white/40'}`}
						aria-label={`Go to slide ${i + 1}`}
					/>
				))}
			</div>
		</section>
	);
}


