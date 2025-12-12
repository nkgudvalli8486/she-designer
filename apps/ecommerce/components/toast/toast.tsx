'use client';

import { useEffect } from 'react';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast, useToast } from './toast-context';
import { cn } from '@nts/ui';

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 shadow-lg',
        'animate-in slide-in-from-top-5 fade-in-0',
        'min-w-[300px] max-w-md'
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          toast.type === 'success' && 'text-pink-600',
          toast.type === 'error' && 'text-pink-600',
          toast.type === 'info' && 'text-pink-600',
          toast.type === 'warning' && 'text-pink-600'
        )}
      />
      <p className="flex-1 text-sm text-pink-600">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded-md p-1 text-neutral-400 hover:text-pink-600 transition-colors"
        aria-label="Close toast"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}

