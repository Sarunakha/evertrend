import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiArrowLeft } from 'react-icons/fi';
import api from '../utils/api';

const Cart = () => {
  const { user } = useAuth();
  const { cart, loading, updateCartItem, removeFromCart, getCartTotal, fetchCart } = useCart();
  const [updating, setUpdating] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/cart');
    }
  }, [user, navigate]);

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const cartItems = cart?.items || [];
    // Find the cart item to check stock
    const cartItem = cartItems.find(item => item._id === itemId);
    if (cartItem && cartItem.productId) {
      const product = cartItem.productId;
      if (newQuantity > product.stockQuantity) {
        alert(`Only ${product.stockQuantity} item(s) available in stock`);
        return;
      }
    }
    
    setUpdating({ ...updating, [itemId]: true });
    const result = await updateCartItem(itemId, newQuantity);
    if (!result.success && result.message) {
      alert(result.message);
    }
    setUpdating({ ...updating, [itemId]: false });
  };

  const handleRemove = async (itemId) => {
    setUpdating({ ...updating, [itemId]: true });
    await removeFromCart(itemId);
    setUpdating({ ...updating, [itemId]: false });
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
      </div>
    );
  }

  const cartItems = cart?.items || [];
  const total = getCartTotal();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/products"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft className="mr-2" />
            Continue Shopping
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FiShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start adding items to your cart!</p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 text-white rounded-md font-semibold transition"
              style={{ backgroundColor: '#fab242' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item) => {
                    const product = item.productId;
                    if (!product) return null;

                    return (
                      <div key={item._id} className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Product Image */}
                          <Link
                            to={`/products/${product._id}`}
                            className="flex-shrink-0 w-full sm:w-32 h-32 bg-gray-100 rounded-md overflow-hidden"
                          >
                            {product.images && product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiShoppingCart className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </Link>

                          {/* Product Details */}
                          <div className="flex-1">
                            <Link
                              to={`/products/${product._id}`}
                              className="text-lg font-semibold text-gray-900 hover:text-primary-600 mb-2"
                            >
                              {product.name}
                            </Link>
                            <p className="text-sm text-gray-600 mb-2">
                              {product.category} • Size: {item.size}
                            </p>
                            <p className="text-lg font-bold text-primary-600 mb-2">
                              Rs.{product.price}
                            </p>
                            {product.stockQuantity === 0 && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded">
                                Out of Stock
                              </span>
                            )}
                            {product.stockQuantity > 0 && product.stockQuantity < 5 && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">
                                Only {product.stockQuantity} left
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center border border-gray-300 rounded-md">
                              <button
                                onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                                disabled={updating[item._id] || item.quantity <= 1}
                                className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FiMinus className="h-4 w-4" />
                              </button>
                              <span className="px-4 py-2 min-w-[3rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                                disabled={updating[item._id] || (product && item.quantity >= product.stockQuantity)}
                                className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FiPlus className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => handleRemove(item._id)}
                              disabled={updating[item._id]}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="mt-4 text-right">
                          <span className="text-gray-600">Subtotal: </span>
                          <span className="font-semibold text-gray-900">
                            Rs.{(product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>Rs.{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-semibold text-gray-900">
                      <span>Total</span>
                      <span>Rs.{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  className="block w-full text-center px-6 py-3 text-white rounded-md font-semibold transition mb-4"
                  style={{ backgroundColor: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                >
                  Proceed to Checkout
                </Link>

                <Link
                  to="/products"
                  className="block w-full text-center px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-semibold transition"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

