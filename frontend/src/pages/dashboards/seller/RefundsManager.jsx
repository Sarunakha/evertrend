import { useState, useEffect } from 'react';
import { FiPackage, FiCheck, FiX, FiClock } from 'react-icons/fi';
import api from '../../../utils/api';
import { resolveAssetUrl } from '../../../utils/env.js';

const RefundsManager = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRefunds();
  }, [filter]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/refunds/seller', { params });
      setRefunds(response.data.data);
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (refundId, newStatus) => {
    try {
      setProcessingId(refundId);
      await api.put(`/refunds/${refundId}/status`, { status: newStatus });
      await fetchRefunds(); // Refresh the list
    } catch (error) {
      console.error('Error updating refund status:', error);
      alert(error.response?.data?.message || 'Error updating refund status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Refunded':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" style={{ borderColor: '#fab242' }}></div>
          <p className="mt-4 text-gray-500">Loading refund requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Refund Requests</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'all'
                ? 'text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
            style={filter === 'all' ? { backgroundColor: '#fab242' } : {}}
          >
            All
          </button>
          <button
            onClick={() => setFilter('Pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'Pending'
                ? 'text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
            style={filter === 'Pending' ? { backgroundColor: '#fab242' } : {}}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('Approved')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              filter === 'Approved'
                ? 'text-white'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
            style={filter === 'Approved' ? { backgroundColor: '#fab242' } : {}}
          >
            Approved
          </button>
        </div>
      </div>

      {refunds.length === 0 ? (
        <div className="text-center py-12">
          <FiPackage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No refund requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <div
              key={refund._id}
              className="border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      Order #{refund.orderId?._id?.toString().slice(-8) || 'N/A'}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        refund.status
                      )}`}
                    >
                      {refund.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Product:</strong> {refund.productId?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Buyer:</strong> {refund.userId?.username || refund.userId?.email || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Amount:</strong> Rs. {refund.amount?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Requested:</strong> {formatDate(refund.createdAt)}
                  </p>
                </div>
                {refund.productId?.images?.[0] && (
                  <img
                    src={resolveAssetUrl(refund.productId.images[0])}
                    alt={refund.productId.name}
                    className="w-20 h-20 object-cover rounded-lg ml-4"
                  />
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Reason:</strong> {refund.reason}
                </p>

                {refund.images && refund.images.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Images:</p>
                    <div className="flex space-x-2">
                      {refund.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Refund evidence ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {refund.status === 'Pending' && (
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => handleStatusUpdate(refund._id, 'Approved')}
                      disabled={processingId === refund._id}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiCheck className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(refund._id, 'Rejected')}
                      disabled={processingId === refund._id}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiX className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}

                {refund.status === 'Approved' && (
                  <div className="mt-4">
                    <button
                      onClick={() => handleStatusUpdate(refund._id, 'Refunded')}
                      disabled={processingId === refund._id}
                      className="flex items-center space-x-2 px-4 py-2 text-white rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#fab242' }}
                    >
                      <FiCheck className="h-4 w-4" />
                      <span>Mark as Refunded</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RefundsManager;
