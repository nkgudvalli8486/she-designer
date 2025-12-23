'use client';

import Link from 'next/link';
import { Globe, Plus, Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function Topbar() {
	const [notificationCount, setNotificationCount] = useState(0);
	const pathname = usePathname();
	const hasWarnedRef = useRef(false);
	
	useEffect(() => {
		// Clear count when on notifications page
		if (pathname === '/notifications') {
			setNotificationCount(0);
			return;
		}
		
		// Fetch notification count
		const fetchNotifications = async () => {
			try {
				const res = await fetch('/api/notifications?unread=true', { cache: 'no-store' });
				if (!res.ok) return;

				const data = await res.json().catch(() => null);
				if (!data || data.disabled) return;
				if (data.notifications) {
					// Filter out viewed notifications
					const viewedStr = localStorage.getItem('viewedNotifications');
					const viewedIds = viewedStr ? JSON.parse(viewedStr) : [];
					const unread = data.notifications.filter((n: any) => !viewedIds.includes(n.id));
					setNotificationCount(unread.length);
				}
			} catch (error) {
				// Avoid spamming console every 30s if backend/env isn't configured in dev.
				if (!hasWarnedRef.current) {
					hasWarnedRef.current = true;
					if (process.env.NODE_ENV !== 'production') {
						console.warn('Notifications unavailable:', error);
					}
				}
			}
		};
		
		fetchNotifications();
		
		// Listen for notifications viewed event
		const handleViewed = () => {
			setNotificationCount(0);
		};
		window.addEventListener('notificationsViewed', handleViewed);
		
		// Refresh every 30 seconds
		const interval = setInterval(fetchNotifications, 30000);
		return () => {
			clearInterval(interval);
			window.removeEventListener('notificationsViewed', handleViewed);
		};
	}, [pathname]);
	
	return (
		<div className="h-16 border-b border-neutral-800 bg-neutral-900/80 text-neutral-200 backdrop-blur sticky top-0 z-40">
			<div className="h-full container flex items-center justify-between">
				<h1 className="text-xl font-semibold">She Designer Admin</h1>
				<div className="flex items-center gap-3">
					<Link
						href="/notifications"
						className="relative inline-flex items-center justify-center rounded-md border border-neutral-700 p-2 hover:bg-neutral-800 hover:text-white transition-colors"
						title="Notifications"
					>
						<Bell className="h-5 w-5" />
						{notificationCount > 0 && (
							<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-xs font-semibold text-white">
								{notificationCount > 9 ? '9+' : notificationCount}
							</span>
						)}
					</Link>
					<a
						href={process.env.NEXT_PUBLIC_ECOM_BASE_URL || 'http://localhost:3000'}
						className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 hover:text-white"
						target="_blank"
						rel="noreferrer"
					>
						<Globe className="h-4 w-4" />
						<span>View Website</span>
					</a>
					<Link
						href="/products/add"
						className="inline-flex items-center gap-2 rounded-md bg-pink-600 text-white px-3 py-2 text-sm hover:bg-pink-700"
					>
						<Plus className="h-4 w-4" />
						<span>Add Product</span>
					</Link>
				</div>
			</div>
		</div>
	);
}


