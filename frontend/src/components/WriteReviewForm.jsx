import { useState, useEffect } from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const WriteReviewForm = ({ productId, onReviewSubmitted, onCancel }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [hasPurchased, setHasPurchased] = useState(null); // null = checking, true/false = result

  useEffect(() => {
    checkPurchaseStatus();
  }, [productId, user]);

  const checkPurchaseStatus = async () => {
    if (!user) {
      setHasPurchased(false);
      return;
    }

    try {
      // Check if user has purchased this product by checking their orders
      const response = await api.get(`/orders`);
      if (response.data.success) {
        const orders = response.data.data || [];
        // Check if any order contains this product
        const hasOrdered = orders.some(order => {
          // This is a simplified check - in a real scenario, you'd check OrderItems
          // For now, we'll rely on the backend verification
          return order.status === 'Delivered' || order.status === 'Shipped';
        });
        setHasPurchased(hasOrdered);
      }
    } catch (error) {
      console.error('Error checking purchase status:', error);
      // Don't block the form - let backend handle verification
      setHasPurchased(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please login to write a review');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      setError('Please write a comment');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await api.post('/reviews', {
        productId: productId,
        rating: rating,
        comment: comment.trim()
      });

      if (response.data.success) {
        // Reset form
        setRating(0);
        setComment('');
        setError('');
        
        // Notify parent component
        if (onReviewSubmitted) {
          onReviewSubmitted(response.data.data);
        }
      } else {
        setError(response.data.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Submit review error:', error);
      setError(
        error.response?.data?.message || 
        'Failed to submit review. Please ensure you have purchased this product.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setRating(i + 1)}
        onMouseEnter={() => setHoveredRating(i + 1)}
        onMouseLeave={() => setHoveredRating(0)}
        className="focus:outline-none transition"
        disabled={submitting}
      >
        <FiStar
          className={`h-8 w-8 transition ${
            i < (hoveredRating || rating)
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300'
          }`}
        />
      </button>
    ));
  };

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600 mb-4">Please login to write a review</p>
        <p className="text-sm text-gray-500">
          Only customers who have purchased this product can leave a review.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Write a Review</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <FiX className="h-5 w-5" />
          </button>
        )}
      </div>

      {hasPurchased === false && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-4">
          <p className="text-sm">
            You can only review products you have purchased. Please complete a purchase first.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <div className="flex items-center space-x-2">
            {renderStars(5)}
            {rating > 0 && (
              <span className="ml-2 text-sm text-gray-600">
                {rating} {rating === 1 ? 'star' : 'stars'}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Review *
          </label>
          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError('');
            }}
            rows={6}
            maxLength={1000}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            placeholder="Share your experience with this product..."
            required
            disabled={submitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length} / 1000 characters
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={submitting || rating === 0 || !comment.trim()}
            className="px-6 py-2 text-white rounded-md font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#fab242' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default WriteReviewForm;

