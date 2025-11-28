'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders, getAuthTokenClient } from '@/src/lib/auth-client';

export function RemoveFromWishlist(props: { productId: string }) {
  const [removing, setRemoving] = useState(false);
  const router = useRouter();
  return (
    <button
      className="h-10 px-4 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50"
      disabled={removing}
      onClick={async () => {
        const token = getAuthTokenClient();
        if (!token) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }
        try {
          setRemoving(true);
          const res = await fetch(`/api/public/wishlist?productId=${encodeURIComponent(props.productId)}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (res.ok) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('wishlist:changed'));
            }
            router.refresh();
          } else if (res.status === 401) {
            window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          }
        } finally {
          setRemoving(false);
        }
      }}
    >
      {removing ? 'Removing…' : 'Remove'}
    </button>
  );
}


