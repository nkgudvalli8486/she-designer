'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RefundStatusCheckerProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  paidAmountCents: number;
}

export function RefundStatusChecker({ 
  orderId, 
  orderStatus, 
  paymentStatus, 
  paidAmountCents 
}: RefundStatusCheckerProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Only check if order is cancelled with paid status
  const shouldCheck = orderStatus === 'cancelled' && paymentStatus === 'paid' && paidAmountCents > 0;

  useEffect(() => {
    if (!shouldCheck) return;

    // Check immediately on mount
    checkRefundStatus();

    // Then check every 30 seconds
    const interval = setInterval(() => {
      checkRefundStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [shouldCheck, orderId]);

  async function checkRefundStatus() {
    if (isChecking) return;
    
    setIsChecking(true);
    setLastCheck(new Date());

    try {
      // Trigger a server action to check refunds
      const response = await fetch(`/api/public/orders/${orderId}/check-refund`, {
        method: 'POST',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.refunded) {
          // Refund found, refresh the page
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Error checking refund status:', error);
    } finally {
      setIsChecking(false);
    }
  }

  if (!shouldCheck) return null;

  return (
    <div className="mt-2 text-xs text-neutral-500">
      {isChecking ? (
        <span>Checking for refunds...</span>
      ) : lastCheck ? (
        <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
      ) : null}
    </div>
  );
}

