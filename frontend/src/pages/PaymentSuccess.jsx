import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiArrowLeft } from 'react-icons/fi';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the data parameter from URL
    const dataParam = searchParams.get('data');
    
    if (dataParam) {
      try {
        // Decode Base64 string
        const decodedData = atob(dataParam);
        const parsedData = JSON.parse(decodedData);
        setPaymentData(parsedData);
      } catch (error) {
        console.error('Error decoding payment data:', error);
        // If decoding fails, try to parse as query string
        const params = new URLSearchParams(dataParam);
        const data = {};
        params.forEach((value, key) => {
          data[key] = value;
        });
        setPaymentData(data);
      }
    }
    
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been confirmed and will be processed shortly.
        </p>

        {paymentData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Transaction Details:</h3>
            <div className="space-y-2 text-sm">
              {paymentData.transaction_uuid && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium text-gray-900">{paymentData.transaction_uuid}</span>
                </div>
              )}
              {paymentData.total_amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">Rs. {paymentData.total_amount}</span>
                </div>
              )}
              {paymentData.product_code && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Code:</span>
                  <span className="font-medium text-gray-900">{paymentData.product_code}</span>
                </div>
              )}
              {paymentData.status && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">{paymentData.status}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            to="/dashboard/buyer/orders"
            className="block w-full px-6 py-3 text-white rounded-md font-semibold transition"
            style={{ backgroundColor: '#fab242' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
          >
            View My Orders
          </Link>
          
          <Link
            to="/products"
            className="flex items-center justify-center w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition"
          >
            <FiArrowLeft className="mr-2" />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

