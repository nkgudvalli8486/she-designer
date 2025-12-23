import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/src/lib/supabase-admin';

export async function GET() {
  const supabase = getSupabaseAdminClient();
  
  try {
    // Fetch all orders with payment status
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, total_cents, created_at, status, payment_status, customer_id')
      .order('created_at', { ascending: true });

    // Fetch order items for product analytics
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('name, quantity, unit_amount_cents, order_id, orders!inner(payment_status, created_at)')
      .eq('orders.payment_status', 'paid')
      .limit(1000);

    // Fetch customers count
    const { data: customers } = await supabase
      .from('customers')
      .select('id, created_at');

    // Calculate sales over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const salesByDate: Record<string, { revenue: number; orders: number }> = {};
    const paidOrders = (allOrders || []).filter((o: any) => 
      o.payment_status === 'paid' && new Date(o.created_at) >= thirtyDaysAgo
    );

    paidOrders.forEach((order: any) => {
      const date = new Date(order.created_at).toISOString().split('T')[0] ?? null;
      if (!date) return;
      if (!salesByDate[date]) salesByDate[date] = { revenue: 0, orders: 0 };
      salesByDate[date].revenue += order.total_cents / 100;
      salesByDate[date].orders += 1;
    });

    const salesData = Object.entries(salesByDate)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Order status distribution
    const statusCounts: Record<string, number> = {};
    (allOrders || []).forEach((order: any) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    // Payment status distribution
    const paymentCounts: Record<string, number> = {};
    (allOrders || []).forEach((order: any) => {
      paymentCounts[order.payment_status] = (paymentCounts[order.payment_status] || 0) + 1;
    });

    const paymentData = Object.entries(paymentCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));

    // Top products by revenue
    const productRevenue: Record<string, { revenue: number; quantity: number }> = {};
    (orderItems || []).forEach((item: any) => {
      const productName = item.name || 'Unknown';
      if (!productRevenue[productName]) {
        productRevenue[productName] = { revenue: 0, quantity: 0 };
      }
      productRevenue[productName].revenue += (item.unit_amount_cents || 0) * (item.quantity || 1) / 100;
      productRevenue[productName].quantity += item.quantity || 1;
    });

    const topProducts = Object.entries(productRevenue)
      .map(([name, data]) => ({
        name: name.length > 30 ? name.substring(0, 30) + '...' : name,
        revenue: data.revenue,
        quantity: data.quantity
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyRevenue: Record<string, number> = {};
    (allOrders || []).filter((o: any) => 
      o.payment_status === 'paid' && new Date(o.created_at) >= sixMonthsAgo
    ).forEach((order: any) => {
      const month = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.total_cents / 100);
    });

    const monthlyData = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });

    // Customer growth (last 30 days)
    const customerGrowth: Record<string, number> = {};
    (customers || []).filter((c: any) => new Date(c.created_at) >= thirtyDaysAgo).forEach((customer: any) => {
      const date = new Date(customer.created_at).toISOString().split('T')[0] ?? null;
      if (!date) return;
      customerGrowth[date] = (customerGrowth[date] || 0) + 1;
    });

    const customerData = Object.entries(customerGrowth)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totalRevenue = (allOrders || [])
      .filter((o: any) => o.payment_status === 'paid')
      .reduce((sum: number, o: any) => sum + (o.total_cents / 100), 0);

    const totalOrders = (allOrders || []).length;
    const totalCustomers = (customers || []).length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return NextResponse.json({
      salesData,
      statusData,
      paymentData,
      topProducts,
      monthlyData,
      customerData,
      totals: {
        revenue: totalRevenue,
        orders: totalOrders,
        customers: totalCustomers,
        averageOrderValue
      }
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

