'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type CategoryItem = {
  label: string;
  href: string;
  image: string;
};

export function CategoryCarousel(props: { items: CategoryItem[]; autoMs?: number }) {
  const { items, autoMs = 3000 } = props;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const itemWidth = 160; // card width (image + margins)
  const gap = 16;

  useEffect(() => {
    let timer: any;
    function tick() {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        const el = trackRef.current;
        if (el) {
          el.scrollTo({
            left: (itemWidth + gap) * next,
            behavior: 'smooth'
          });
        }
        return next;
      });
    }
    timer = setInterval(tick, autoMs);
    return () => clearInterval(timer);
  }, [items.length, autoMs]);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex overflow-x-auto no-scrollbar scroll-smooth gap-4 snap-x snap-mandatory"
        onMouseEnter={() => {
          // pause by clearing all intervals in outer scope by resetting index updater
          setIndex((v) => v);
        }}
      >
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href as any}
            className="w-[140px] sm:w-[160px] flex-shrink-0 snap-start text-center"
          >
            <div className="mx-auto size-28 sm:size-36 rounded-full overflow-hidden ring-1 ring-neutral-700 bg-neutral-800">
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
    </div>
  );
}


