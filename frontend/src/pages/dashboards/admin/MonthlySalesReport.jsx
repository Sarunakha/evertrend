import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingCart } from 'lucide-react';
import api from '../../../utils/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const MonthlySalesReport = () => {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/admin/sales-report', {
          params: { month, year }
        });
        if (res.data.success) setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load sales report.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [month, year]);

  const lineChartData = useMemo(() => {
    if (!data?.dailyData?.length) return [];
    return data.dailyData.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: d.revenue,
      orders: d.orders
    }));
  }, [data?.dailyData]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Sales Report</h2>
        <div className="animate-pulse space-y-6">
          <div className="flex gap-4">
            <div className="h-24 flex-1 bg-gray-200 rounded-lg" />
            <div className="h-24 flex-1 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
          <div className="h-32 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Sales Report</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const summary = data?.summary || { totalRevenue: 0, totalOrders: 0 };
  const topProducts = data?.topProducts || [];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Monthly Sales Report</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-green-500 p-3 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="text-xl font-bold text-gray-900">{summary.totalOrders}</p>
          </div>
        </div>
      </div>

      {/* Line chart: Revenue and Orders by day */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily revenue & orders</h3>
        {lineChartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f97316" name="Revenue" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" name="Orders" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-500 text-sm">
            No sales data for this month.
          </div>
        )}
      </div>

      {/* Top 3 products */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 3 selling products</h3>
        {topProducts.length > 0 ? (
          <ul className="space-y-2">
            {topProducts.map((p, i) => (
              <li
                key={p.productId?.toString() || i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 text-orange-700 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="font-medium text-gray-900">{p.name}</span>
                </div>
                <span className="text-sm text-gray-600">{p.quantitySold} sold</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm py-2">No product sales in this month.</p>
        )}
      </div>
    </div>
  );
};

export default MonthlySalesReport;
