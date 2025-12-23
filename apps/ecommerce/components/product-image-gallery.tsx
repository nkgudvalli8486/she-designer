'use client';

import { useState, useRef } from 'react';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return (
      <div className="space-y-3">
        <div className="aspect-square rounded-lg bg-neutral-800 overflow-hidden relative">
          <div className="h-full w-full flex items-center justify-center text-neutral-500">
            No Image
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Thumbnail Images - Vertical Stack on Left */}
      {images.length > 1 && (
        <div className="flex flex-col gap-2 flex-shrink-0">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImageIndex(i)}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-md overflow-hidden bg-neutral-800 border-2 transition-all ${
                selectedImageIndex === i 
                  ? 'border-primary' 
                  : 'border-transparent hover:border-neutral-600'
              }`}
            >
              <img 
                src={src} 
                alt={`${productName} - Thumbnail ${i + 1}`} 
                className="h-full w-full object-cover" 
              />
            </button>
          ))}
        </div>
      )}
      
      {/* Main Image - Compact Size */}
      <div className="flex-1 max-w-xs sm:max-w-sm mx-auto">
        <div 
          ref={imageRef}
          className="aspect-[3/4] rounded-lg bg-neutral-800 overflow-hidden relative group cursor-zoom-in"
          onMouseMove={(e) => {
            if (!imageRef.current) return;
            const rect = imageRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setMousePosition({ x, y });
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${images[selectedImageIndex]})`,
              backgroundSize: isHovering ? '200%' : '100%',
              backgroundPosition: isHovering ? `${mousePosition.x}% ${mousePosition.y}%` : 'center center',
              backgroundRepeat: 'no-repeat',
              transition: isHovering ? 'none' : 'background-size 0.3s ease',
            }}
          />
          <img 
            src={images[selectedImageIndex]} 
            alt={`${productName} - Image ${selectedImageIndex + 1}`} 
            className="h-full w-full object-cover opacity-0 pointer-events-none" 
          />
          {/* Fullscreen button */}
          <button
            className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-md transition-colors z-10"
            aria-label="View fullscreen"
            onClick={() => {
              // Open image in new tab for fullscreen view
              window.open(images[selectedImageIndex], '_blank');
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

