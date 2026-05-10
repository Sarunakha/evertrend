import { useState, useEffect } from 'react';
import { Shield, Activity, Flag } from 'lucide-react';
import api from '../../../utils/api';
import MonthlySalesReport from './MonthlySalesReport';

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveFeed, setLiveFeed] = useState([]);
  const [liveFeedStatus, setLiveFeedStatus] = useState('connecting'); // connecting | connected | disconnected

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLiveFeedStatus('disconnected');
      return;
    }

    const es = new EventSource(`/api/admin/live-sales?token=${encodeURIComponent(token)}`);
    setLiveFeedStatus('connecting');

    const onReady = () => setLiveFeedStatus('connected');
    const onOrder = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setLiveFeed((prev) => [data, ...prev].slice(0, 25));
      } catch {
        // ignore parse errors
      }
    };

    es.addEventListener('ready', onReady);
    es.addEventListener('order.created', onOrder);
    es.onerror = () => setLiveFeedStatus('disconnected');

    return () => es.close();
  }, []);

  const fetchOverview = async () => {
    try {
      const response = await api.get('/admin/overview');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatOrderId = (id) => {
    if (!id) return '';
    const s = String(id);
    return s.slice(-8);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Income',
      value: formatCurrency(stats?.stats?.income ?? stats?.stats?.revenue ?? 0),
      icon: Shield,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Users',
      value: stats?.stats?.users || 0,
      icon: Activity,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Flagged Products',
      value: stats?.stats?.flaggedProducts || 0,
      icon: Flag,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} rounded-xl p-6 shadow-md hover:shadow-lg transition`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Sales Report */}
      <MonthlySalesReport />

      {/* Live Sales Feed */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Live Sales Feed</h2>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                liveFeedStatus === 'connected'
                  ? 'bg-green-500'
                  : liveFeedStatus === 'connecting'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              }`}
            />
            <span className="text-gray-600">
              {liveFeedStatus === 'connected'
                ? 'Live'
                : liveFeedStatus === 'connecting'
                ? 'Connecting…'
                : 'Disconnected'}
            </span>
          </div>
        </div>

        {liveFeed.length === 0 ? (
          <p className="text-gray-500 text-sm">No new orders yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-auto pr-1">
            {liveFeed.map((o, idx) => (
              <div key={`${o?._id || 'order'}-${idx}`} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    Order #{formatOrderId(o?._id)}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {o?.user?.username || o?.user?.email || 'Unknown buyer'} • NPR {o?.totalAmount ?? 0}
                  </p>
                  {Array.isArray(o?.items) && o.items.length > 0 && (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      Items: {o.items.slice(0, 2).map((it) => it?.name).filter(Boolean).join(', ')}
                      {o.items.length > 2 ? ` +${o.items.length - 2} more` : ''}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {o?.status || 'Pending'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {o?.createdAt ? formatDate(o.createdAt) : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        
        <div className="space-y-4">
          {/* Recent Orders */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Orders</h3>
            <div className="space-y-2">
              {stats?.recentActivity?.orders?.length > 0 ? (
                stats.recentActivity.orders.map((order, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order._id.slice(-6)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.userId?.username || 'Unknown'} • {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent orders</p>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Users</h3>
            <div className="space-y-2">
              {stats?.recentActivity?.users?.length > 0 ? (
                stats.recentActivity.users.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'Seller' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent users</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;

