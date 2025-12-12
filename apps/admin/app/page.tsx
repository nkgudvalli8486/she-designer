import { StatCard } from '@/components/stat-card';
import { Package, ShoppingCart, Users, IndianRupee } from 'lucide-react';
import { RecentOrders } from '@/components/recent-orders';
import Link from 'next/link';
import { getSupabaseServerClient } from '@/src/lib/supabase-server';

export default async function AdminDashboardPage() {
	const supabase = getSupabaseServerClient();
	
	// Fetch real stats
	const [productsResult, ordersResult, customersResult, revenueResult] = await Promise.all([
		supabase.from('products').select('id', { count: 'exact', head: true }).eq('deleted_at', null),
		supabase.from('orders').select('id', { count: 'exact', head: true }),
		supabase.from('customers').select('id', { count: 'exact', head: true }),
		supabase.from('orders').select('total_cents').eq('payment_status', 'paid')
	]);

	const totalProducts = productsResult.count || 0;
	const totalOrders = ordersResult.count || 0;
	const totalCustomers = customersResult.count || 0;
	const revenue = (revenueResult.data || []).reduce((sum, o) => sum + (o.total_cents || 0), 0);

	return (
		<div className="space-y-6">
			<div className="rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 text-white p-6">
				<h2 className="text-2xl font-semibold">Welcome back!</h2>
				<p className="mt-1 text-white/90">
					Manage your store, track orders, and add new products to grow your business.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard icon={<Package className="text-pink-600" />} label="Total Products" value={totalProducts.toLocaleString()} />
				<StatCard icon={<ShoppingCart className="text-emerald-600" />} label="Total Orders" value={totalOrders.toLocaleString()} />
				<StatCard icon={<Users className="text-violet-600" />} label="Total Customers" value={totalCustomers.toLocaleString()} />
				<StatCard icon={<IndianRupee className="text-rose-600" />} label="Revenue" value={`₹${(revenue / 100).toLocaleString()}`} />
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="space-y-4 lg:col-span-1">
					<div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
						<div className="font-semibold mb-3">Quick Actions</div>
						<div className="space-y-3">
							<Link href="/products/add" className="flex items-center justify-between rounded-md border border-neutral-700 p-3 hover:bg-neutral-800">
								<span>Add New Product</span>
								<span className="text-muted-foreground">→</span>
							</Link>
							<Link href="/products" className="flex items-center justify-between rounded-md border border-neutral-700 p-3 hover:bg-neutral-800">
								<span>View All Products</span>
								<span className="text-muted-foreground">→</span>
							</Link>
						</div>
					</div>
				</div>
				<div className="lg:col-span-2">
					<RecentOrders />
				</div>
			</div>
		</div>
	);
}


