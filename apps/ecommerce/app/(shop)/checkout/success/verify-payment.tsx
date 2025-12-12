'use client';

import { useEffect, useRef } from 'react';
import { verifyAndUpdateOrder } from './actions';

export function VerifyPayment({ orderId, sessionId }: { orderId?: string; sessionId?: string }) {
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Prevent running multiple times
    if (hasRunRef.current) return;
    
    // Check sessionStorage to see if we've already verified
    const verificationKey = `payment_verified_${orderId || sessionId || 'unknown'}`;
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(verificationKey)) {
        hasRunRef.current = true;
        return;
      }
    }
    
    hasRunRef.current = true;
    
    const verify = async () => {
      try {
        console.log('Verifying payment client-side:', { sessionId, orderId });
        const result = await verifyAndUpdateOrder(sessionId, orderId);
        if (result.success) {
          // Mark as verified in sessionStorage to prevent re-running
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(verificationKey, 'true');
            // Trigger cart refresh event (no page reload)
            window.dispatchEvent(new Event('cart:changed'));
          }
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Reset flag on error so it can retry
        hasRunRef.current = false;
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(verificationKey);
        }
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return null;
}

