'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CancelOrderButtonAdminProps {
  orderId: string;
  orderStatus: string;
}

export function CancelOrderButtonAdmin({ orderId, orderStatus }: CancelOrderButtonAdminProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Don't show button if order is already cancelled or delivered
  if (orderStatus === 'cancelled' || orderStatus === 'delivered') {
    return null;
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order? This will process a refund if payment was made.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      alert('Order cancelled successfully. Refund processed if applicable.');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
      console.error('Error cancelling order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
      >
        {isLoading ? 'Cancelling...' : 'Cancel Order'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

