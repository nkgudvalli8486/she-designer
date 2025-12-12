'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthTokenClient } from '@/src/lib/auth-client';
import { useToast } from '@/components/toast';

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  disabled?: boolean;
}

export function CancelOrderButton({ orderId, orderStatus, paymentStatus, disabled }: CancelOrderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { success, error: showError } = useToast();

  // Don't show button if order is already cancelled, delivered, or shipped
  if (orderStatus === 'cancelled' || orderStatus === 'delivered' || orderStatus === 'shipped') {
    return null;
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthTokenClient();
      if (!token) {
        setError('Please log in to cancel orders');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/public/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      // Show success message
      success('Order cancelled successfully. Refund will be processed if payment was made.');
      
      // Refresh the page to show updated status
      router.refresh();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to cancel order';
      setError(errorMsg);
      showError(errorMsg);
      console.error('Error cancelling order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        onClick={handleCancel}
        disabled={isLoading || disabled}
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

