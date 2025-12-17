import { useState } from 'react';
import api from '../utils/api';

const EsewaPayment = ({ amount, products = [], shippingAddress = {}, onError, onLoading }) => {
  const [loading, setLoading] = useState(false);

  const handleEsewaPayment = async () => {
    try {
      setLoading(true);
      if (onLoading) onLoading(true);

      // First, create the order
      const orderItems = products.map(item => ({
        productId: item.productId?._id || item.productId || item._id,
        quantity: item.quantity
      }));

      const orderResponse = await api.post('/orders', {
        items: orderItems,
        paymentMethod: 'eSewa',
        shippingAddress: shippingAddress
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || 'Failed to create order');
      }

      const order = orderResponse.data.data;
      const orderAmount = order.totalAmount || amount;

      // Call backend to get payment form data
      const response = await api.post('/payment/esewa', {
        amount: orderAmount,
        products: orderItems
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }

      const { formUrl, formData } = response.data.data;

      // Validate form data before submission
      if (!formUrl || !formData) {
        throw new Error('Invalid payment form data received from server');
      }

      // Verify required fields are present
      const requiredFields = ['total_amount', 'transaction_uuid', 'product_code', 'signature', 'signed_field_names'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required payment fields: ${missingFields.join(', ')}`);
      }

      // Debug: Log form data (remove signature for security)
      console.log('Submitting eSewa form:', {
        formUrl,
        formDataKeys: Object.keys(formData),
        formData: { ...formData, signature: '[HIDDEN]' },
        signatureLength: formData.signature?.length
      });

      // Create a hidden form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = formUrl;
      form.target = '_self'; // Submit in same window
      form.style.display = 'none';
      form.setAttribute('accept-charset', 'UTF-8');
      form.setAttribute('enctype', 'application/x-www-form-urlencoded');

      // Add all form fields - ensure all values are properly formatted strings
      // Important: Add fields in the order eSewa expects
      const fieldOrder = [
        'amount',
        'tax_amount',
        'total_amount',
        'transaction_uuid',
        'product_code',
        'product_service_charge',
        'product_delivery_charge',
        'success_url',
        'failure_url',
        'signed_field_names',
        'signature'
      ];

      fieldOrder.forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          // Ensure value is a string and trim any whitespace
          input.value = String(formData[key]).trim();
          form.appendChild(input);
          
          // Debug: Log each field being added
          if (key !== 'signature') {
            console.log(`Form field ${key}:`, input.value);
          }
        }
      });

      // Verify form has inputs
      if (form.children.length === 0) {
        throw new Error('Form has no fields to submit');
      }

      console.log(`Form created with ${form.children.length} fields, submitting to: ${formUrl}`);
      
      // Verify form action is set correctly
      if (!form.action || form.action !== formUrl) {
        throw new Error(`Form action mismatch: expected ${formUrl}, got ${form.action}`);
      }

      // Append form to body
      document.body.appendChild(form);
      
      // Verify form is in DOM before submitting
      if (!document.body.contains(form)) {
        throw new Error('Form was not added to DOM');
      }
      
      // Submit form immediately
      try {
        form.submit();
        console.log('Form submitted successfully');
      } catch (submitError) {
        console.error('Error submitting form:', submitError);
        // Fallback: try programmatic submission
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        if (form.dispatchEvent(submitEvent)) {
          form.submit();
        } else {
          throw new Error('Form submission was prevented');
        }
      }
    } catch (error) {
      console.error('eSewa payment error:', error);
      setLoading(false);
      if (onLoading) onLoading(false);
      if (onError) {
        onError(error.response?.data?.message || error.message || 'Failed to initialize eSewa payment. Please try again.');
      } else {
        alert(error.response?.data?.message || error.message || 'Failed to initialize eSewa payment. Please try again.');
      }
    }
  };

  return (
    <button
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

