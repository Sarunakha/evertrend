import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiRefreshCw, FiX, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../../../utils/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnForm, setReturnForm] = useState({
    reason: '',
    images: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const navigate = useNavigate();

  const CANCELLATION_REASONS = [
    'Changed my mind',
    'Found a better price',
    'Ordered by mistake',
    'Delivery time is too long',
    'Other'
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = (order, item) => {
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
      alert('Delivery confirmed successfully!');
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error confirming delivery:', error);
      alert(error.response?.data?.message || 'Error confirming delivery');
    } finally {
      setConfirmingDelivery(null);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.reason.trim()) {
      alert('Please provide a reason for the return');
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
      alert('Return request submitted successfully!');
      setShowReturnModal(false);
      setReturnForm({ reason: '', images: [] });
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error submitting return request:', error);
      alert(error.response?.data?.message || 'Error submitting return request');
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

  const handleCancelClick = (order) => {
    setCancellingOrder(order);
    setShowCancelModal(true);
    setCancelReason('');
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert('Please select a cancellation reason');
      return;
    }

    try {
      setSubmittingCancel(true);
      await api.post(`/orders/${cancellingOrder._id}/cancel`, {
        reason: cancelReason
      });
      alert('Cancellation request submitted successfully! Admin will review your request.');
      setShowCancelModal(false);
      setCancelReason('');
      setCancellingOrder(null);
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error submitting cancellation request:', error);
      alert(error.response?.data?.message || 'Error submitting cancellation request');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Processing':
        return 'bg-purple-100 text-purple-800';
      case 'Cancellation Requested':
        return 'bg-orange-100 text-orange-800';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
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
                    {(order.status === 'Pending' || order.status === 'Processing') && (
                      <button
                        onClick={() => handleCancelClick(order)}
                        className="mt-2 flex items-center space-x-1 px-3 py-1 text-sm rounded-md hover:opacity-90 transition"
                        style={{ backgroundColor: '#ef4444', color: 'white' }}
                      >
                        <FiXCircle className="h-4 w-4" />
                        <span>Cancel Order</span>
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
                              src={item.productId.images[0]}
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
                          {order.status === 'Delivered' && (
                            <button
                              onClick={() => handleReturnClick(order, item)}
                              className="mt-2 flex items-center space-x-1 px-3 py-1 text-sm rounded-md hover:opacity-90 transition"
                              style={{ backgroundColor: '#fab242', color: 'white' }}
                            >
                              <FiRefreshCw className="h-4 w-4" />
                              <span>Return Item</span>
                            </button>
                          )}
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
                        src={selectedItem.productId.images[0]}
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

      {/* Cancel Order Modal */}
      {showCancelModal && cancellingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellingOrder(null);
                    setCancelReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Order #{cancellingOrder._id.toString().slice(-8)}</p>
                <p className="font-medium text-gray-900">
                  Total: Rs. {cancellingOrder.totalAmount?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Placed on {formatDate(cancellingOrder.orderDate)}
                </p>
              </div>

              <form onSubmit={handleCancelSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Cancellation *
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select a reason...</option>
                    {CANCELLATION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Your cancellation request will be sent to the admin for review. 
                    The order will only be cancelled after admin approval.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellingOrder(null);
                      setCancelReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCancel || !cancelReason}
                    className="px-4 py-2 text-white rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    {submittingCancel ? 'Submitting...' : 'Submit Cancellation Request'}
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
