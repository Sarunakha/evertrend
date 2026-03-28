import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { FiPackage, FiCheckCircle } from 'react-icons/fi';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/sellers/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (error) {
      alert('Error updating order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Order Fulfillment</h2>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <FiPackage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-semibold">Order #{order._id.slice(-8)}</p>
                  <p className="text-sm text-gray-500">
                    Customer: {order.userId?.username || order.userId?.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="text-lg font-bold mt-2">Rs.{order.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="font-medium mb-2">Items:</h4>
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm mb-1">
                    <span>
                      {item.productId?.name || 'Product'} x {item.quantity}
                    </span>
                    <span>Rs.{(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {order.status !== 'Delivered' && (
                <div className="flex space-x-2">
                  {order.status === 'Pending' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'Shipped')}
                      className="text-white px-4 py-2 rounded-md text-sm transition"
                      style={{ backgroundColor: '#fab242' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                    >
                      Mark as Shipped
                    </button>
                  )}
                  {order.status === 'Shipped' && (
                    <button
                      onClick={() => updateOrderStatus(order._id, 'Delivered')}
                      className="text-white px-4 py-2 rounded-md text-sm transition"
                      style={{ backgroundColor: '#fab242' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                    >
                      Mark as Delivered
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;

