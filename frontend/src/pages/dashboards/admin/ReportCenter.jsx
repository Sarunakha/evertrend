import { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../../utils/api';
import DangerZone from '../../../components/DangerZone';

const ReportCenter = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [dangerZone, setDangerZone] = useState({ isOpen: false, action: null, report: null });

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, typeFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await api.get(`/admin/reports?${params}`);
      if (response.data.success) {
        setReports(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, status) => {
    try {
      const response = await api.put(`/admin/reports/${reportId}`, {
        status,
        adminNotes: adminNotes || undefined
      });
      if (response.data.success) {
        fetchReports();
        setSelectedReport(null);
        setAdminNotes('');
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert(error.response?.data?.message || 'Failed to update report status');
    }
  };

  const handleDelete = async (reportId) => {
    try {
      const response = await api.delete(`/admin/reports/${reportId}`);
      if (response.data.success) {
        fetchReports();
        setDangerZone({ isOpen: false, action: null, report: null });
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert(error.response?.data?.message || 'Failed to delete report');
    }
  };

  const openDangerZone = (action, report) => {
    setDangerZone({ isOpen: true, action, report });
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      Resolved: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      Dismissed: { icon: XCircle, color: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded flex items-center space-x-1 ${badge.color}`}>
        <Icon className="h-3 w-3" />
        <span>{status}</span>
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const colors = {
      'Scam': 'bg-red-100 text-red-800',
      'Harassment': 'bg-orange-100 text-orange-800',
      'IP Theft': 'bg-purple-100 text-purple-800',
      'Inappropriate Content': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[type] || colors.Other}`}>
        {type}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Flag className="h-6 w-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">Report Handling Center</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="Scam">Scam</option>
            <option value="Harassment">Harassment</option>
            <option value="IP Theft">IP Theft</option>
            <option value="Inappropriate Content">Inappropriate Content</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No reports found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div
                key={report._id}
                className="p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getTypeBadge(report.reportType)}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Reported by: <span className="font-medium">{report.reportedBy?.username || 'Unknown'}</span>
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Target: <span className="font-medium">{report.targetType}</span> • ID: {report.targetId.toString().slice(-6)}
                    </p>
                    <p className="text-gray-700 mt-3">{report.description}</p>
                    {report.adminNotes && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-blue-900 mb-1">Admin Notes:</p>
                        <p className="text-sm text-blue-800">{report.adminNotes}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-3">
                      Submitted: {formatDate(report.createdAt)}
                      {report.resolvedAt && ` • Resolved: ${formatDate(report.resolvedAt)} by ${report.resolvedBy?.username || 'Admin'}`}
                    </p>
                  </div>
                </div>

                {report.status === 'Pending' && (
                  <div className="mt-4 flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setAdminNotes(report.adminNotes || '');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Resolve</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setAdminNotes(report.adminNotes || '');
                        handleStatusUpdate(report._id, 'Dismissed');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Dismiss</span>
                    </button>
                    <button
                      onClick={() => openDangerZone('delete', report)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
                    >
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Resolve Report</h3>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add admin notes (optional)..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setAdminNotes('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedReport._id, 'Resolved')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone Modal */}
      <DangerZone
        isOpen={dangerZone.isOpen}
        onClose={() => setDangerZone({ isOpen: false, action: null, report: null })}
        onConfirm={() => {
          if (dangerZone.action === 'delete' && dangerZone.report) {
            handleDelete(dangerZone.report._id);
          }
        }}
        title="Delete Report"
        message={`Are you sure you want to delete this report? This action cannot be undone.`}
        confirmText="Delete Report"
      />
    </div>
  );
};

export default ReportCenter;

