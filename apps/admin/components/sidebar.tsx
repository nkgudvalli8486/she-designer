'use client';

import Link from 'next/link';
import { Boxes, Box, Package, PlusCircle, LayoutGrid, ShoppingCart, Users, BarChart3, Image as ImageIcon, Settings, Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const items = [
	{ href: '/', icon: <Boxes className="h-4 w-4" />, label: 'Dashboard' },
	{ section: 'Products' },
	{ href: '/products', icon: <Package className="h-4 w-4" />, label: 'All Products' },
	{ href: '/products/add', icon: <PlusCircle className="h-4 w-4" />, label: 'Add Product' },
	{ href: '/categories', icon: <LayoutGrid className="h-4 w-4" />, label: 'Categories' },
	{ href: '/inventory', icon: <Box className="h-4 w-4" />, label: 'Inventory' },
	{ section: 'Operations' },
	{ href: '/orders', icon: <ShoppingCart className="h-4 w-4" />, label: 'Orders' },
	{ href: '/notifications', icon: <Bell className="h-4 w-4" />, label: 'Notifications' },
	{ href: '/customers', icon: <Users className="h-4 w-4" />, label: 'Customers' },
	{ href: '/analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
	{ href: '/media', icon: <ImageIcon className="h-4 w-4" />, label: 'Media Library' },
	{ href: '/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings' }
];

export function Sidebar() {
	const pathname = usePathname();
	return (
		<aside className="hidden md:flex md:flex-col w-64 border-r border-neutral-800 bg-neutral-900/80 text-neutral-200 backdrop-blur sticky top-0 h-screen">
			<div className="h-16 flex items-center gap-2 px-4 border-b border-neutral-800">
				<div className="h-9 w-9 rounded-lg bg-pink-600 text-white flex items-center justify-center">
					<Boxes className="h-5 w-5" />
				</div>
				<div className="font-semibold">Admin</div>
			</div>
			<nav className="flex-1 overflow-auto px-2 py-4">
				{items.map((it, idx) =>
					it.section ? (
						<div key={`s-${idx}`} className="mt-6 mb-2 px-2 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
							{it.section}
						</div>
					) : (
						<Link
							key={it.href}
							href={it.href! as any}
							className={clsx(
								'flex items-center gap-3 px-3 py-2 rounded-md text-sm text-neutral-200 hover:bg-neutral-800 hover:text-white',
								pathname === it.href && 'bg-neutral-800 text-white'
							)}
						>
							{it.icon}
							<span>{it.label}</span>
						</Link>
					)
				)}
			</nav>
		</aside>
	);
}


