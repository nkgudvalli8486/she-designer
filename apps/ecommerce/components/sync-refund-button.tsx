'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthTokenClient } from '@/src/lib/auth-client';
import { useToast } from '@/components/toast';

interface SyncRefundButtonProps {
  orderId: string;
}

export function SyncRefundButton({ orderId }: SyncRefundButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const router = useRouter();
  const { success, error: showError, info } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const token = await getAuthTokenClient();
      if (!token) {
        setSyncError('Please log in to sync refund status');
        setIsSyncing(false);
        return;
      }

      const response = await fetch(`/api/public/orders/${orderId}/sync-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to sync refund status';
        const errorDetails = data.details || '';
        throw new Error(errorDetails ? `${errorMessage}. ${errorDetails}` : errorMessage);
      }

      if (data.refunded) {
        success('Refund status synced successfully! The order has been updated.');
        router.refresh();
      } else {
        info('No refund found for this order in Stripe.');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to sync refund status';
      setSyncError(errorMsg);
      showError(errorMsg);
      console.error('Error syncing refund:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
      >
        {isSyncing ? 'Syncing from Stripe...' : '🔄 Sync Refund Status from Stripe'}
      </button>
      {syncError && (
        <p className="mt-2 text-sm text-red-500">{syncError}</p>
      )}
      <p className="mt-2 text-xs text-neutral-400">
        If you processed a refund in Stripe Dashboard, click this button to update the order status.
      </p>
    </div>
  );
}

