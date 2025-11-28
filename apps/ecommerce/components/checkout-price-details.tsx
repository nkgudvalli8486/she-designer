'use client';

import { Price } from './price';

interface CheckoutPriceDetailsProps {
  mrp: number;
  discount: number;
  platformFee: number;
  total: number;
}

export function CheckoutPriceDetails({ mrp, discount, platformFee, total }: CheckoutPriceDetailsProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6 h-fit">
      <h3 className="text-base font-semibold mb-4">Price Details</h3>
      <div className="space-y-2 text-sm text-neutral-300">
        <div className="flex justify-between">
          <span>Total MRP</span>
          <span><Price amount={mrp} /></span>
        </div>
        <div className="flex justify-between">
          <span>Discount on MRP</span>
          <span className="text-green-400">- <Price amount={discount} /></span>
        </div>
        <div className="flex justify-between">
          <span>Platform Fee</span>
          <span><Price amount={platformFee} /></span>
        </div>
        <div className="border-t border-neutral-800 my-2" />
        <div className="flex justify-between font-semibold text-base">
          <span>Total Amount</span>
          <span><Price amount={total + platformFee} /></span>
        </div>
      </div>
    </div>
  );
}

