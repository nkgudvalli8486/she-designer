'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

interface AnalyticsData {
  salesData: Array<{ date: string; revenue: number; orders: number }>;
  statusData: Array<{ name: string; value: number }>;
  paymentData: Array<{ name: string; value: number }>;
  topProducts: Array<{ name: string; revenue: number; quantity: number }>;
  monthlyData: Array<{ month: string; revenue: number }>;
  customerData: Array<{ date: string; count: number }>;
  totals: {
    revenue: number;
    orders: number;
    customers: number;
    averageOrderValue: number;
  };
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading analytics...</div>
      </div>
    );
  }

  if (!data || !data.totals) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">No data available</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="text-sm text-neutral-400 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-pink-400">{formatCurrency(data.totals.revenue)}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="text-sm text-neutral-400 mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-blue-400">{data.totals.orders.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="text-sm text-neutral-400 mb-1">Total Customers</div>
          <div className="text-2xl font-bold text-purple-400">{data.totals.customers.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="text-sm text-neutral-400 mb-1">Avg Order Value</div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(data.totals.averageOrderValue)}</div>
        </div>
      </div>

      {/* Sales Over Time */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h3 className="text-lg font-semibold mb-4 text-neutral-200">Sales Over Time (Last 30 Days)</h3>
        {data.salesData && data.salesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.salesData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatDate}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#ec4899' }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#ec4899" 
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-neutral-400">
            No sales data available for the last 30 days
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="text-lg font-semibold mb-4 text-neutral-200">Monthly Revenue (Last 6 Months)</h3>
          {data.monthlyData && data.monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `₹${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#ec4899' }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
              />
              <Bar dataKey="revenue" fill="#ec4899" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-400">
              No monthly data available
            </div>
          )}
        </div>

        {/* Order Status Distribution */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="text-lg font-semibold mb-4 text-neutral-200">Order Status Distribution</h3>
          {data.statusData && data.statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={data.statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#ec4899' }}
              />
            </PieChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-400">
              No order status data available
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Status */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="text-lg font-semibold mb-4 text-neutral-200">Payment Status</h3>
          {data.paymentData && data.paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={data.paymentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#ec4899' }}
              />
            </PieChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-400">
              No payment data available
            </div>
          )}
        </div>

        {/* Customer Growth */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="text-lg font-semibold mb-4 text-neutral-200">Customer Growth (Last 30 Days)</h3>
          {data.customerData && data.customerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.customerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={formatDate}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#ec4899' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-neutral-400">
              No customer growth data available
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h3 className="text-lg font-semibold mb-4 text-neutral-200">Top Products by Revenue</h3>
        {data.topProducts && data.topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.topProducts} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `₹${value / 1000}k`}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              width={200}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#ec4899' }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
            />
            <Bar dataKey="revenue" fill="#ec4899" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-neutral-400">
            No product data available
          </div>
        )}
      </div>
    </div>
  );
}

