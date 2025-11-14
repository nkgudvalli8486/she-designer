'use client';

import { useEffect } from 'react';

export function WishlistDebug(props: { items: any[] }) {
  useEffect(() => {
    // Log wishlist items (including image URLs) to the browser console
    // This helps verify that products and images are being resolved correctly
    // eslint-disable-next-line no-console
    console.log('Wishlist (client):', props.items);
  }, [props.items]);
  return null;
}


