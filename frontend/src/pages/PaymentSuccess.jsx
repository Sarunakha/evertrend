import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { FiCheckCircle, FiArrowLeft, FiStar } from 'react-icons/fi';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order data from location state (if redirected from checkout)
    if (location.state?.order) {
      setOrderData(location.state.order);
    }

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
  }, [searchParams, location]);

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

        {/* Points Earned Banner */}
        {orderData?.pointsEarned && orderData.pointsEarned > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">You Earned</p>
                <h3 className="text-3xl font-bold flex items-center">
                  <FiStar className="mr-2" />
                  {orderData.pointsEarned} TrendPoints!
                </h3>
                <p className="text-orange-100 text-sm mt-2">
                  Points have been added to your account
                </p>
              </div>
              <Link
                to="/dashboard/buyer/points"
                className="px-4 py-2 bg-white text-orange-600 rounded-md font-semibold hover:bg-orange-50 transition text-sm"
              >
                View Points
              </Link>
            </div>
          </div>
        )}

        {/* Transaction Details */}
        {(paymentData || orderData) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Order Details:</h3>
            <div className="space-y-2 text-sm">
              {orderData?._id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-medium text-gray-900">{orderData._id}</span>
                </div>
              )}
              {paymentData?.transaction_uuid && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium text-gray-900">{paymentData.transaction_uuid}</span>
                </div>
              )}
              {(orderData?.totalAmount || paymentData?.total_amount) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-gray-900">
                    Rs. {orderData?.totalAmount || paymentData?.total_amount}
                  </span>
                </div>
              )}
              {orderData?.couponDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Discount Applied:</span>
                  <span className="font-medium text-green-600">
                    -Rs. {orderData.couponDiscount.toFixed(2)}
                  </span>
                </div>
              )}
              {orderData?.couponCode && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Coupon Used:</span>
                  <span className="font-medium text-gray-900">{orderData.couponCode}</span>
                </div>
              )}
              {paymentData?.status && (
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

