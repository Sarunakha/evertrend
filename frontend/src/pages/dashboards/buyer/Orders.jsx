import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiRefreshCw, FiX, FiCheckCircle } from 'react-icons/fi';
import api from '../../../utils/api';
import { resolveAssetUrl } from '../../../utils/env.js';
import CancelOrderModal from '../../../components/CancelOrderModal';

const REFUND_STATUS_LABELS = {
  Pending: 'Return requested',
  Approved: 'Return approved',
  Refunded: 'Refunded',
  Rejected: 'Return rejected'
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' });
  const [toastTimer, setToastTimer] = useState(null);
  const [returnForm, setReturnForm] = useState({
    reason: '',
    images: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [toastTimer]);

  const showToast = (message, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    setToast({ open: true, message, type });
    const timer = setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 2200);
    setToastTimer(timer);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordersResponse, refundsResponse] = await Promise.all([
        api.get('/orders'),
        api.get('/refunds', { params: { limit: 200 } })
      ]);
      setOrders(ordersResponse.data.data || []);
      setRefundRequests(refundsResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRefundForItem = (orderId, productId) => {
    const orderKey = orderId?.toString?.() || String(orderId);
    const productKey = productId?.toString?.() || String(productId);
    return refundRequests.find((refund) => {
      const refundOrderId = (refund.orderId?._id || refund.orderId)?.toString();
      const refundProductId = (refund.productId?._id || refund.productId)?.toString();
      return refundOrderId === orderKey && refundProductId === productKey;
    });
  };

  const canRequestReturn = (orderId, productId) => {
    const existing = getRefundForItem(orderId, productId);
    return !existing || existing.status === 'Rejected';
  };

  const handleReturnClick = (order, item) => {
    const productId = item.productId?._id || item.productId;
    if (!canRequestReturn(order._id, productId)) {
      const existing = getRefundForItem(order._id, productId);
      showToast(
        REFUND_STATUS_LABELS[existing?.status] || 'Return already submitted for this item',
        'error'
      );
      return;
    }
    setSelectedOrder(order);
    setSelectedItem(item);
    setShowReturnModal(true);
    setReturnForm({ reason: '', images: [] });
  };

  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm('Have you received this order? Confirm delivery?')) {
      return;
    }

    try {
      setConfirmingDelivery(orderId);
      await api.put(`/orders/${orderId}/confirm-delivery`);
      showToast('Delivery confirmed successfully!', 'success');
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error confirming delivery:', error);
      showToast(error.response?.data?.message || 'Error confirming delivery', 'error');
    } finally {
      setConfirmingDelivery(null);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.reason.trim()) {
      showToast('Please provide a reason for the return.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/refunds', {
        orderId: selectedOrder._id,
        productId: selectedItem.productId._id,
        reason: returnForm.reason,
        images: returnForm.images
      });
      showToast('Return request submitted successfully!', 'success');
      setShowReturnModal(false);
      setReturnForm({ reason: '', images: [] });
      await fetchOrders();
    } catch (error) {
      console.error('Error submitting return request:', error);
      showToast(error.response?.data?.message || 'Error submitting return request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(images => {
      setReturnForm(prev => ({
        ...prev,
        images: [...prev.images, ...images]
      }));
    });
  };

  const removeImage = (index) => {
    setReturnForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleCancelOrderClick = (order) => {
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  const handleCancelOrderSubmit = async (reason) => {
    if (!orderToCancel) return;
    try {
      setCancelSubmitting(true);
      await api.post(`/orders/${orderToCancel._id}/cancel`, { reason });
      showToast('Cancellation request submitted. Awaiting admin approval.', 'success');
      setShowCancelModal(false);
      setOrderToCancel(null);
      fetchOrders();
    } catch (error) {
      console.error('Cancel order error:', error);
      showToast(error.response?.data?.message || 'Failed to submit cancellation request', 'error');
    } finally {
      setCancelSubmitting(false);
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
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" style={{ borderColor: '#fab242' }}></div>
          <p className="mt-4 text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast.open && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`px-4 py-2 rounded-md shadow-lg text-sm font-medium border ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="border rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      Order #{order._id.toString().slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Placed on {formatDate(order.orderDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <p className="text-lg font-bold mt-2">
                      Rs. {order.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                    {(order.status === 'Pending' || order.status === 'Processing') && (
                      <button
                        type="button"
                        onClick={() => handleCancelOrderClick(order)}
                        className="mt-2 flex items-center space-x-1 px-3 py-1 text-sm rounded-md hover:opacity-90 transition border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <FiX className="h-4 w-4" />
                        <span>Cancel Order</span>
                      </button>
                    )}
                    {order.status === 'Shipped' && (
                      <button
                        onClick={() => handleConfirmDelivery(order._id)}
                        disabled={confirmingDelivery === order._id}
                        className="mt-2 flex items-center space-x-1 px-3 py-1 text-sm rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#fab242', color: 'white' }}
                      >
                        <FiCheckCircle className="h-4 w-4" />
                        <span>{confirmingDelivery === order._id ? 'Confirming...' : 'Confirm Delivery'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Items:</h4>
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          {item.productId?.images?.[0] && (
                            <img
                              src={resolveAssetUrl(item.productId.images[0])}
                              alt={item.productId.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.productId?.name || 'Product'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {item.quantity} × Rs. {item.unitPrice?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            Rs. {(item.unitPrice * item.quantity)?.toFixed(2) || '0.00'}
                          </p>
                          {order.status === 'Delivered' && (() => {
                            const productId = item.productId?._id || item.productId;
                            const existingRefund = getRefundForItem(order._id, productId);
                            const returnAllowed = canRequestReturn(order._id, productId);

                            if (returnAllowed) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleReturnClick(order, item)}
                                  className="mt-2 flex items-center space-x-1 px-3 py-1 text-sm rounded-md hover:opacity-90 transition"
                                  style={{ backgroundColor: '#fab242', color: 'white' }}
                                >
                                  <FiRefreshCw className="h-4 w-4" />
                                  <span>Return Item</span>
                                </button>
                              );
                            }

                            return (
                              <p
                                className={`mt-2 text-sm font-medium ${
                                  existingRefund?.status === 'Refunded'
                                    ? 'text-green-700'
                                    : existingRefund?.status === 'Rejected'
                                      ? 'text-red-700'
                                      : 'text-amber-700'
                                }`}
                              >
                                {REFUND_STATUS_LABELS[existingRefund?.status] || 'Return submitted'}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCancelModal && orderToCancel && (
        <CancelOrderModal
          order={orderToCancel}
          onClose={() => { setShowCancelModal(false); setOrderToCancel(null); }}
          onSubmit={handleCancelOrderSubmit}
          submitting={cancelSubmitting}
        />
      )}

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Request Return</h3>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {selectedItem && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {selectedItem.productId?.images?.[0] && (
                      <img
                        src={resolveAssetUrl(selectedItem.productId.images[0])}
                        alt={selectedItem.productId.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedItem.productId?.name || 'Product'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {selectedItem.quantity} × Rs. {selectedItem.unitPrice?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleReturnSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Return *
                  </label>
                  <textarea
                    value={returnForm.reason}
                    onChange={(e) =>
                      setReturnForm({ ...returnForm, reason: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="4"
                    placeholder="Please explain why you want to return this item..."
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {returnForm.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {returnForm.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Upload ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <FiX className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-white rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#fab242' }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
