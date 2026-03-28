import { useState, useEffect } from 'react';
import { FiStar, FiCheckCircle, FiUser } from 'react-icons/fi';
import api from '../utils/api';

const ReviewList = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, 5, 4, 3, 2, 1

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/reviews/product/${productId}`);
      if (response.data.success) {
        setReviews(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(review => review.rating === parseInt(filter));

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FiStar
        key={i}
        className={`h-5 w-5 ${
          i < rating
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-lg">No reviews yet</p>
          <p className="text-gray-500 text-sm mt-2">Be the first to review this product!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-8">
          {/* Rating Summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {averageRating}
                </div>
                <div className="flex justify-center items-center space-x-1 mb-2">
                  {renderStars(Math.round(averageRating))}
                </div>
                <p className="text-sm text-gray-600">
                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2 mt-6">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = ratingDistribution[rating];
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center space-x-2">
                      <button
                        onClick={() => setFilter(filter === rating.toString() ? 'all' : rating.toString())}
                        className={`flex items-center space-x-1 text-sm ${
                          filter === rating.toString()
                            ? 'text-orange-600 font-semibold'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>{rating}</span>
                        <FiStar className="h-4 w-4 text-yellow-400 fill-current" />
                      </button>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 w-full text-sm text-orange-600 hover:text-orange-700"
                >
                  Show all reviews
                </button>
              )}
            </div>
          </div>

          {/* Reviews List */}
          <div className="md:col-span-3">
            <div className="space-y-6">
              {filteredReviews.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-600">No reviews found for this filter</p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-white rounded-lg shadow-md p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <FiUser className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900">
                              {review.userId?.username || 'Anonymous'}
                            </p>
                            {review.verifiedPurchase && (
                              <span
                                className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded"
                                title="Verified Purchase"
                              >
                                <FiCheckCircle className="h-3 w-3" />
                                <span>Verified Purchase</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(review.reviewDate || review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewList;

