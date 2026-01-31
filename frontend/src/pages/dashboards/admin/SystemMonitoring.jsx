import { useState, useEffect } from 'react';
import { Activity, HardDrive, AlertCircle, TrendingUp } from 'lucide-react';
import api from '../../../utils/api';

const SystemMonitoring = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/admin/monitor');
      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getServerLoadColor = (load) => {
    if (load < 50) return 'text-green-600';
    if (load < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLatencyColor = (latency) => {
    if (latency < 100) return 'text-green-600';
    if (latency < 200) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !metrics) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <HardDrive className="h-6 w-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Server Load */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-600">Server Load</h3>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-bold ${getServerLoadColor(metrics?.serverLoad || 0)}`}>
                {metrics?.serverLoad?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (metrics?.serverLoad || 0) < 50 ? 'bg-green-500' :
                  (metrics?.serverLoad || 0) < 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(metrics?.serverLoad || 0, 100)}%` }}
              ></div>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {(metrics?.serverLoad || 0) < 50 ? 'Optimal' :
             (metrics?.serverLoad || 0) < 80 ? 'Moderate' : 'High'}
          </p>
        </div>

        {/* API Latency */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-600">API Latency</h3>
            </div>
          </div>
          <div className="mb-4">
            <span className={`text-3xl font-bold ${getLatencyColor(metrics?.apiLatency || 0)}`}>
              {metrics?.apiLatency || 0}ms
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {(metrics?.apiLatency || 0) < 100 ? 'Excellent' :
             (metrics?.apiLatency || 0) < 200 ? 'Good' : 'Needs Attention'}
          </p>
        </div>

        {/* Memory Usage */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-600">Memory Usage</h3>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900">
                {metrics?.memoryUsage?.percentage?.toFixed(1) || 0}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(metrics?.memoryUsage?.percentage || 0, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatBytes(metrics?.memoryUsage?.used || 0)} / {formatBytes(metrics?.memoryUsage?.total || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Uptime</p>
            <p className="text-lg font-medium text-gray-900">
              {metrics?.uptime ? formatUptime(metrics.uptime) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Node.js Version</p>
            <p className="text-lg font-medium text-gray-900">v{process.version || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Error Logs */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Error Logs</h3>
          <AlertCircle className="h-5 w-5 text-gray-600" />
        </div>
        {metrics?.errorLogs && metrics.errorLogs.length > 0 ? (
          <div className="space-y-3">
            {metrics.errorLogs.map((log, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  log.level === 'ERROR' ? 'bg-red-50 border-red-500' :
                  log.level === 'WARN' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-gray-50 border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${
                    log.level === 'ERROR' ? 'text-red-800' :
                    log.level === 'WARN' ? 'text-yellow-800' :
                    'text-gray-800'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{log.message}</p>
                <p className="text-xs text-gray-500">Source: {log.source}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p>No errors in the last hour</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMonitoring;

