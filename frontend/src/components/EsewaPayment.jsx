import { useState } from 'react';
import api from '../utils/api';
import { getApiOrigin } from '../utils/env.js';
import { useCart } from '../context/CartContext';

const EsewaPayment = ({ amount, products = [], shippingAddress = {}, couponCode = null, onError, onLoading }) => {
  const [loading, setLoading] = useState(false);
  const { clearCart } = useCart();

  const handleEsewaPayment = async () => {
    try {
      setLoading(true);
      if (onLoading) onLoading(true);

      const orderItems = products.map((item) => ({
        productId: item.productId?._id || item.productId || item._id,
        quantity: item.quantity
      }));

      const orderResponse = await api.post('/orders', {
        items: orderItems,
        paymentMethod: 'eSewa',
        shippingAddress,
        couponCode
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const order = orderResponse.data.data;
      const orderAmount = Number(order.totalAmount ?? amount);

      const paymentResponse = await api.post('/payment/esewa', {
        amount: orderAmount,
        orderId: order._id
      });

      if (!paymentResponse.data.success) {
        throw new Error(paymentResponse.data.message || 'Failed to initialize eSewa payment');
      }

      const data = paymentResponse.data.data;
      sessionStorage.setItem('esewa_pending_order_id', String(order._id));
      await clearCart();

      if (data.devMock && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in again to continue payment');
      }

      const backendOrigin =
        getApiOrigin() ||
        import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') ||
        'http://127.0.0.1:5001';

      const submitUrl = `${backendOrigin}/api/payment/esewa/submit?orderId=${order._id}&token=${encodeURIComponent(token)}`;
      window.location.href = submitUrl;
    } catch (error) {
      console.error('eSewa payment error:', error);
      setLoading(false);
      if (onLoading) onLoading(false);

      const apiErrors = error.response?.data?.errors;
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        (Array.isArray(apiErrors) ? apiErrors.map((e) => e.msg).join(', ') : null) ||
        error.message ||
        'Failed to initialize eSewa payment. Please try again.';

      if (onError) onError(message);
      else alert(message);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleEsewaPayment}
        disabled={loading || !amount || amount <= 0}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-md font-semibold transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>Pay with eSewa</span>
          </>
        )}
      </button>
    </div>
  );
};

export default EsewaPayment;
