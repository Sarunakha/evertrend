import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { FiPackage, FiTrendingUp } from 'react-icons/fi';

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/sellers/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg shadow-md p-6 text-white" style={{ background: 'linear-gradient(to right, #22c55e, #16a34a)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-emerald-100">Total Revenue (Delivered)</p>
              <p className="text-3xl font-bold">Rs. {stats.revenue.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg shadow-md p-6 text-white bg-gradient-to-r from-rose-500 to-rose-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-rose-100">Lost Revenue (Cancelled / Returned)</p>
              <p className="text-3xl font-bold">
                Rs. {stats.revenue.lost ? stats.revenue.lost.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Products</h3>
            <FiPackage className="h-6 w-6" style={{ color: '#fab242' }} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold">{stats.products.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active:</span>
              <span className="font-bold" style={{ color: '#fab242' }}>{stats.products.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sold:</span>
              <span className="font-bold" style={{ color: '#b4b4b4' }}>{stats.products.sold}</span>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Orders</h3>
            <FiTrendingUp className="h-6 w-6" style={{ color: '#fab242' }} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold">{stats.orders.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-bold" style={{ color: '#fab242' }}>{stats.orders.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipped:</span>
              <span className="font-bold" style={{ color: '#c2c9d6' }}>{stats.orders.shipped}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivered:</span>
              <span className="font-bold" style={{ color: '#b4b4b4' }}>{stats.orders.delivered}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;

