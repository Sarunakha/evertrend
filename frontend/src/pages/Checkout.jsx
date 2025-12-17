import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import EsewaPayment from '../components/EsewaPayment';
import { FiArrowLeft, FiMapPin, FiCreditCard } from 'react-icons/fi';
import api from '../utils/api';

const Checkout = () => {
  const { user } = useAuth();
  const { cart, getCartTotal, fetchCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('eSewa');
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Nepal'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && cart && cart.items && cart.items.length === 0) {
      navigate('/cart');
    }
  }, [user, cart, navigate]);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const handleCashOnDelivery = async () => {
    if (!cart || !cart.items || cart.items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderItems = cart.items.map(item => ({
        productId: item.productId._id || item.productId,
        quantity: item.quantity
      }));

      const response = await api.post('/orders', {
        items: orderItems,
        paymentMethod: 'Cash on Delivery',
        shippingAddress: shippingAddress
      });

      if (response.data.success) {
        // Clear cart and redirect to success page
        await fetchCart();
        navigate('/checkout/success', { 
          state: { order: response.data.data } 
        });
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to process checkout. Please try again.');
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
          <Link
            to="/cart"
            className="inline-block px-6 py-3 text-white rounded-md font-semibold transition"
            style={{ backgroundColor: '#fab242' }}
          >
            Go to Cart
          </Link>
        </div>
      </div>
    );
  }

  const cartItems = cart.items || [];
  const total = getCartTotal();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/cart"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="mr-2" />
            Back to Cart
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiMapPin className="mr-2" />
                Shipping Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={shippingAddress.street}
                    onChange={handleAddressChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="ZIP Code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={shippingAddress.country}
                      onChange={handleAddressChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiCreditCard className="mr-2" />
                Payment Method
              </h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-md cursor-pointer hover:border-primary-500 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="eSewa"
                    checked={paymentMethod === 'eSewa'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-semibold text-gray-900">eSewa</span>
                    <p className="text-sm text-gray-600">Pay securely with eSewa</p>
                  </div>
                </label>
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-md cursor-pointer hover:border-primary-500 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Cash on Delivery"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-semibold text-gray-900">Cash on Delivery</span>
                    <p className="text-sm text-gray-600">Pay when you receive your order</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => {
                  const product = item.productId;
                  if (!product) return null;
                  return (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {product.name} x {item.quantity}
                      </span>
                      <span className="text-gray-900 font-medium">
                        Rs.{(product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-semibold text-gray-900">
                    <span>Total</span>
                    <span>Rs.{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {paymentMethod === 'eSewa' ? (
                <EsewaPayment
                  amount={total}
                  products={cartItems.map(item => ({
                    productId: item.productId?._id || item.productId,
                    quantity: item.quantity,
                    _id: item._id
                  }))}
                  shippingAddress={shippingAddress}
                  onError={setError}
                  onLoading={setLoading}
                />
              ) : (
                <button
                  onClick={handleCashOnDelivery}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-md font-semibold transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#fab242' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#d19c49')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#fab242')}
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

