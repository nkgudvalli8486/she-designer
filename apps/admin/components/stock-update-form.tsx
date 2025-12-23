'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@nts/ui';

interface StockUpdateFormProps {
  productId: string;
  currentStock: number;
  onUpdate: (newStock: number) => Promise<void>;
}

export function StockUpdateForm({ productId, currentStock, onUpdate }: StockUpdateFormProps) {
  const [stock, setStock] = useState(currentStock);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // If increasing stock significantly, show confirmation
    if (stock > currentStock && stock > currentStock + 5) {
      setShowConfirm(true);
      return;
    }
    
    await updateStock();
  };

  const updateStock = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(stock);
      setShowConfirm(false);
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const stockChange = stock - currentStock;
  const isIncrease = stockChange > 0;
  const isDecrease = stockChange < 0;

  return (
    <div className="flex flex-col gap-2">
      {showConfirm && (
        <div className="mb-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <p className="text-sm text-yellow-400 mb-2">
            You are increasing stock from {currentStock} to {stock}. Confirm this change?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={updateStock}
              disabled={isUpdating}
              className="text-xs px-2 py-1"
            >
              Confirm
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setStock(currentStock);
              }}
              className="text-xs px-2 py-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex flex-col gap-1">
          <input
            type="number"
            value={stock}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0;
              setStock(Math.max(0, newValue));
              setShowConfirm(false);
            }}
            min={0}
            step={1}
            className="w-24 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 px-2 py-1"
            title="Available stock quantity. Increase when new inventory arrives."
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500">Current: {currentStock}</span>
            {stockChange !== 0 && (
              <span className={isIncrease ? 'text-green-400' : 'text-red-400'}>
                {isIncrease ? '+' : ''}{stockChange}
              </span>
            )}
          </div>
        </div>
        <Button type="submit" variant="outline" disabled={isUpdating || stock === currentStock}>
          {isUpdating ? 'Saving...' : 'Save'}
        </Button>
      </form>
      {isDecrease && stock < currentStock && (
        <p className="text-xs text-yellow-400">
          ⚠️ Reducing stock. Make sure items are sold or removed.
        </p>
      )}
    </div>
  );
}

