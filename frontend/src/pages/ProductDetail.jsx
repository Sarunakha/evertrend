import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiShoppingCart, FiHeart, FiUser, FiMessageSquare } from 'react-icons/fi';
import VirtualTryOnModal from '../components/VirtualTryOnModal';
import ReviewList from '../components/ReviewList';
import WriteReviewForm from '../components/WriteReviewForm';
import api from '../utils/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showTryOn, setShowTryOn] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      setSelectedSize(product.size);
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.data);
      if (user) {
        setIsLiked(response.data.data.likes?.includes(user._id));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      const response = await api.post(`/products/${id}/like`);
      setIsLiked(response.data.data.isLiked);
      setProduct({ ...product, likesCount: response.data.data.likesCount });
    } catch (error) {
      console.error('Error liking product:', error);
    }
  };

  const handleMessageSeller = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/products/${id}`));
      return;
    }
    const sellerId = product.sellerId?._id || product.sellerId;
    if (!sellerId || user._id === sellerId) return;

    try {
      const response = await api.post('/conversations/access', {
        sellerId,
        productId: product._id
      });
      const conv = response.data?.data;
      if (conv?._id) {
        navigate(`/dashboard/buyer/messages?conversationId=${conv._id}`);
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
      alert(error.response?.data?.message || 'Failed to start conversation');
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(`/products/${id}`));
      return;
    }

    // Check if user is trying to buy their own product
    if (product && product.sellerId && product.sellerId._id === user._id) {
      const confirmPurchase = window.confirm(
        'This is your own product. Do you want to purchase the product you listed?'
      );
      if (!confirmPurchase) {
        return;
      }
      // Still allow them to proceed if they confirm (for testing purposes)
      // But show a warning
      alert('Note: You are purchasing your own product. This is not recommended.');
    }

    if (!selectedSize) {
      alert('Please select a size');
      return;
    }

    setAddingToCart(true);
    try {
      const result = await addToCart(id, quantity, selectedSize);
      if (result.success) {
        alert('Item added to cart!');
      } else {
        alert(result.message || 'Failed to add item to cart');
      }
    } catch (error) {
      alert(error.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-12">Product not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          {product.images && product.images[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-98 object-cover rounded-lg"
            />
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-2xl font-bold text-primary-600">Rs.{product.price}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{product.condition}</span>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-4">{product.description}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-500">Category:</span>
                <span className="ml-2 font-medium">{product.category}</span>
              </div>
              <div>
                <span className="text-gray-500">Size:</span>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="ml-2 px-2 py-1 border border-gray-300 rounded-md"
                >
                  <option value={product.size}>{product.size}</option>
                </select>
              </div>
              <div>
                <span className="text-gray-500">Stock:</span>
                <span className={`ml-2 font-medium ${
                  product.stockQuantity === 0 
                    ? 'text-red-600' 
                    : product.stockQuantity < 5 
                    ? 'text-orange-600' 
                    : 'text-green-600'
                }`}>
                  {product.stockQuantity === 0 ? 'Out of Stock' : `${product.stockQuantity} available`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max={product.stockQuantity || 1}
                value={quantity}
                onChange={(e) => {
                  const newQuantity = parseInt(e.target.value) || 1;
                  if (newQuantity < 1) {
                    setQuantity(1);
                  } else if (product.stockQuantity > 0 && newQuantity > product.stockQuantity) {
                    setQuantity(product.stockQuantity);
                    alert(`Only ${product.stockQuantity} item(s) available in stock`);
                  } else {
                    setQuantity(newQuantity);
                  }
                }}
                disabled={product.stockQuantity === 0}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleAddToCart}
                disabled={
                  product.isSold || 
                  product.stockQuantity === 0 || 
                  addingToCart || 
                  !selectedSize ||
                  (product.sellerId && product.sellerId._id === user?._id)
                }
                className="flex-1 text-white px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition"
                style={{ backgroundColor: '#fab242' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
              >
                <FiShoppingCart />
                <span>
                  {addingToCart 
                    ? 'Adding...' 
                    : product.isSold 
                    ? 'Sold Out' 
                    : product.sellerId && product.sellerId._id === user?._id
                    ? 'Your Product'
                    : 'Add to Cart'}
                </span>
              </button>
              <button
                onClick={handleLike}
                className={`px-4 py-3 rounded-md border ${
                  isLiked
                    ? 'bg-red-50 border-red-300 text-red-600'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FiHeart className={isLiked ? 'fill-current' : ''} />
              </button>
            </div>

            {/* Simplified VTO (uses product main image + sizeChart) */}
            {user && product.sizeChart && (
              <button
                onClick={() => setShowTryOn(true)}
                className="w-full px-6 py-3 rounded-md transition font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600"
              >
                Try It On Virtually
              </button>
            )}
            {!user && product.sizeChart && (
              <button
                onClick={() => navigate('/login?redirect=' + encodeURIComponent('/virtual-try-on'))}
                className="w-full px-6 py-3 rounded-md transition font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600"
              >
                Login to Try It On
              </button>
            )}

            {product.sellerId && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <FiUser />
                  <span>Seller: {product.sellerId.username || product.sellerId.email}</span>
                </div>
                {user && user._id !== product.sellerId._id && (
                  <button
                    type="button"
                    onClick={handleMessageSeller}
                    className="w-full text-white px-4 py-2 rounded-md flex items-center justify-center space-x-2 transition"
                    style={{ backgroundColor: '#fab242' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                  >
                    <FiMessageSquare />
                    <span>Message Seller</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>Likes: {product.likesCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Simplified VTO Modal */}
      {showTryOn && product && (
        <VirtualTryOnModal
          product={product}
          selectedSize={selectedSize}
          onClose={() => setShowTryOn(false)}
        />
      )}

      {/* Reviews Section */}
      <div className="mt-12">
        {showReviewForm ? (
          <WriteReviewForm
            productId={id}
            onReviewSubmitted={(newReview) => {
              setShowReviewForm(false);
              // Optionally refresh the page or update state
              window.location.reload();
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900"></h2>
              {user && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="px-4 py-2 text-white rounded-md font-semibold transition"
                  style={{ backgroundColor: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                >
                  Write a Review
                </button>
              )}
            </div>
            <ReviewList productId={id} />
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;

