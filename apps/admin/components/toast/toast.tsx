'use client';

import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast, useToast } from './toast-context';
import clsx from 'clsx';

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
			className={clsx(
				'flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 shadow-lg',
				'animate-in slide-in-from-top-5 fade-in-0',
				'min-w-[300px] max-w-md'
			)}
		>
			<Icon className="h-5 w-5 shrink-0 text-pink-600" />
			<p className="flex-1 text-sm text-neutral-100">{toast.message}</p>
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


