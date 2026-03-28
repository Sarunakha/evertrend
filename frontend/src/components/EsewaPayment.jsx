import { useState } from 'react';
import api from '../utils/api';
import { useCart } from '../context/CartContext';

const EsewaPayment = ({ amount, products = [], shippingAddress = {}, couponCode = null, onError, onLoading }) => {
  const [loading, setLoading] = useState(false);
  const { clearCart } = useCart();

  const handleEsewaPayment = async () => {
    try {
      setLoading(true);
      if (onLoading) onLoading(true);

      const orderItems = products.map(item => ({
        productId: item.productId?._id || item.productId || item._id,
        quantity: item.quantity
      }));

      const orderResponse = await api.post('/orders', {
        items: orderItems,
        paymentMethod: 'eSewa',
        shippingAddress: shippingAddress,
        couponCode: couponCode
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const order = orderResponse.data.data;
      const orderAmount = order.totalAmount || amount;

      await clearCart();

      const response = await api.post('/payment/esewa', {
        amount: orderAmount,
        products: orderItems
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }

      const { formUrl, formData } = response.data.data;

      if (!formUrl || !formData) {
        throw new Error('Invalid payment form data received from server');
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = formUrl.trim();
      form.target = '_self';
      form.style.display = 'none';
      form.setAttribute('accept-charset', 'UTF-8');
      form.setAttribute('enctype', 'application/x-www-form-urlencoded');

      Object.keys(formData).forEach((key) => {
        const value = formData[key];
        if (value === undefined || value === null) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      if (form.children.length === 0) {
        throw new Error('Form has no fields to submit');
      }

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error('eSewa payment error:', error);
      setLoading(false);
      if (onLoading) onLoading(false);
      const message = error.response?.data?.message || error.message || 'Failed to initialize eSewa payment. Please try again.';
      if (onError) {
        onError(message);
      } else {
        alert(message);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleEsewaPayment}
      disabled={loading || !amount || amount <= 0}
      className="w-full px-6 py-3 bg-green-600 text-white rounded-md font-semibold transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Pay with eSewa</span>
        </>
      )}
    </button>
  );
};

export default EsewaPayment;
