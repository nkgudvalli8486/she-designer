'use client';

import * as React from 'react';

export function AddressModal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-100">{props.title}</h3>
          <button
            onClick={props.onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{props.children}</div>
      </div>
    </div>
  );
}


