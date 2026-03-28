import { useState, useEffect } from 'react';
import { FiPackage, FiEye, FiX, FiCheck, FiXCircle } from 'react-icons/fi';
import api from '../../../utils/api';

const AdminOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [adminRejectNote, setAdminRejectNote] = useState('');
  const [handlingOrderId, setHandlingOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/admin/all');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      setAdminRejectNote('');
      const response = await api.get(`/orders/${orderId}`);
      setSelectedOrder(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('Error loading order details');
    }
  };

  const handleCancellation = async (orderId, action, adminResponse = '') => {
    try {
      setHandlingOrderId(orderId);
      await api.put(`/orders/${orderId}/handle-cancellation`, {
        action,
        adminResponse: adminResponse.trim() || undefined
      });
      alert(action === 'Approve' ? 'Cancellation approved.' : 'Cancellation rejected.');
      setShowDetailsModal(false);
      setSelectedOrder(null);
      setAdminRejectNote('');
      fetchOrders();
    } catch (error) {
      console.error('Handle cancellation error:', error);
      alert(error.response?.data?.message || 'Failed to process cancellation');
    } finally {
      setHandlingOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Cancellation Requested':
        return 'bg-orange-100 text-orange-800';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
          >
            Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className={`hover:bg-gray-50 ${order.status === 'Cancellation Requested' ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order._id.toString().slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{order.userId?.username || 'N/A'}</div>
                        <div className="text-gray-500 text-xs">{order.userId?.email || ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {order.totalAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(order._id)}
                        className="flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
                      >
                        <FiEye className="h-4 w-4" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Order Details - #{selectedOrder._id.toString().slice(-8)}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {selectedOrder.status === 'Cancellation Requested' && selectedOrder.cancellationRequest?.isRequested && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Cancellation Request</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Reason:</span> {selectedOrder.cancellationRequest.reason || 'N/A'}
                  </p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <button
                      type="button"
                      onClick={() => handleCancellation(selectedOrder._id, 'Approve')}
                      disabled={handlingOrderId === selectedOrder._id}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <FiCheck className="h-4 w-4" />
                      <span>Approve Cancellation</span>
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        value={adminRejectNote}
                        onChange={(e) => setAdminRejectNote(e.target.value)}
                        placeholder="Rejection reason (optional)"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleCancellation(selectedOrder._id, 'Reject', adminRejectNote)}
                        disabled={handlingOrderId === selectedOrder._id}
                        className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
                      >
                        <FiXCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-medium">#{selectedOrder._id.toString().slice(-8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          selectedOrder.status
                        )}`}
                      >
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Date:</span>
                      <span className="font-medium">{formatDate(selectedOrder.orderDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">{selectedOrder.paymentMethod}</span>
                    </div>
                    {selectedOrder.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-medium">{selectedOrder.transactionId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Buyer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedOrder.userId?.username || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedOrder.userId?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.shippingAddress && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Shipping Address</h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm">
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                      {selectedOrder.shippingAddress.zipCode}
                    </p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-4">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      {item.productId?.images?.[0] && (
                        <img
                          src={item.productId.images[0]}
                          alt={item.productId.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.productId?.name || 'Product'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Quantity: {item.quantity} × Rs. {item.unitPrice?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          Rs. {(item.unitPrice * item.quantity)?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    {selectedOrder.couponCode && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Coupon Code:</span>
                        <span className="font-medium">{selectedOrder.couponCode}</span>
                      </div>
                    )}
                    {selectedOrder.couponDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">
                          -Rs. {selectedOrder.couponDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.pointsRedeemed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Points Redeemed:</span>
                        <span className="font-medium">{selectedOrder.pointsRedeemed}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-gray-900">
                      Rs. {selectedOrder.totalAmount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminOrderList;
