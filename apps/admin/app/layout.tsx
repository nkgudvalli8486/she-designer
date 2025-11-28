import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export const metadata: Metadata = {
	title: 'She Designer – Admin',
	description: 'Admin dashboard for products, orders, customers, and CMS.'
};

export default function RootLayout(props: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-gradient-to-b from-black via-neutral-900 to-black text-white">
				<div className="flex">
					<Sidebar />
					<main className="flex-1 min-h-screen">
						<Topbar />
						<div className="container py-6">{props.children}</div>
					</main>
				</div>
			</body>
		</html>
	);
}


