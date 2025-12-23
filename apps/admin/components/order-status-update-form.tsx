'use client';

import { useState } from 'react';
import { Button } from '@nts/ui';

export function OrderStatusUpdateForm({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber || undefined,
          trackingUrl: trackingUrl || undefined,
          notes: notes || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setMessage({ type: 'success', text: 'Order status updated successfully!' });
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="text-lg font-semibold mb-4 text-neutral-200">Update Order Status</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-300">Tracking Number (Optional)</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 placeholder-neutral-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Enter tracking number"
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-300">Tracking URL (Optional)</label>
          <input
            type="url"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 placeholder-neutral-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="https://tracking.example.com/..."
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-neutral-300">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 text-neutral-200 placeholder-neutral-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Add any notes about this status update"
            rows={3}
            disabled={loading}
          />
        </div>
        
        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-900/50 text-green-300 border border-green-700' 
              : 'bg-red-900/50 text-red-300 border border-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        <Button type="submit" disabled={loading || status === currentStatus}>
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </form>
    </div>
  );
}

