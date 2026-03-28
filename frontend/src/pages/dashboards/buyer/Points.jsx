import { useState, useEffect } from 'react';
import { FiStar, FiGift, FiClock, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';
import api from '../../../utils/api';

const Points = () => {
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState(500);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, [page]);

  const fetchBalance = async () => {
    try {
      const response = await api.get('/loyalty/balance');
      if (response.data.success) {
        setBalance(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(`/loyalty/history?page=${page}&limit=10`);
      if (response.data.success) {
        setHistory(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleRedeem = async () => {
    if (!redeemAmount || redeemAmount < 500) {
      setError('Minimum redemption is 500 points (Rs.50 discount)');
      return;
    }

    if (balance && redeemAmount > balance.totalPoints) {
      setError(`Insufficient points. You have ${balance.totalPoints} points.`);
      return;
    }

    try {
      setRedeeming(true);
      setError('');
      setSuccess('');

      // Calculate discount: 500 points = Rs.50, so 1 point = Rs.0.10
      const discountAmount = redeemAmount * 0.1;

      const response = await api.post('/loyalty/redeem', {
        points: redeemAmount,
        discountAmount: discountAmount
      });

      if (response.data.success) {
        setSuccess(`Successfully redeemed ${redeemAmount} points for Rs.${discountAmount} discount coupon!`);
        setRedeemAmount(500);
        await fetchBalance();
        await fetchHistory();
        
        // Show coupon code
        if (response.data.data.coupon) {
          setTimeout(() => {
            alert(`Your coupon code: ${response.data.data.coupon.code}\nDiscount: Rs.${response.data.data.coupon.discountAmount}\nValid until: ${new Date(response.data.data.coupon.validUntil).toLocaleDateString()}`);
          }, 500);
        }
      } else {
        setError(response.data.message || 'Failed to redeem points');
      }
    } catch (error) {
      console.error('Redeem error:', error);
      setError(error.response?.data?.message || 'Failed to redeem points. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earned':
        return <FiTrendingUp className="text-green-500" />;
      case 'redeemed':
        return <FiGift className="text-orange-500" />;
      default:
        return <FiClock className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">TrendPoints</h2>
        <p className="text-gray-600">Earn points with every purchase and redeem them for discounts!</p>
      </div>

      {/* Points Balance Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-orange-100 text-sm mb-1">Available Points</p>
            <h3 className="text-5xl font-bold">{balance?.totalPoints || 0}</h3>
          </div>
          <FiStar className="h-16 w-16 text-orange-200 opacity-50" />
        </div>
        <div className="mt-6 pt-6 border-t border-orange-400">
          <div className="flex justify-between text-sm">
            <span className="text-orange-100">Lifetime Points Earned</span>
            <span className="font-semibold">{balance?.lifetimePoints || 0}</span>
          </div>
          <div className="mt-2 text-xs text-orange-100">
            Earn 1 point for every Rs.25 spent
          </div>
        </div>
      </div>

      {/* Redeem Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FiGift className="mr-2" />
          Redeem Points
        </h3>
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points to Redeem (Minimum: 500 points = Rs.50)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="500"
                step="100"
                value={redeemAmount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setRedeemAmount(value);
                  setError('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter points (min 500)"
              />
              <div className="text-sm text-gray-600">
                = Rs.{(redeemAmount * 0.1).toFixed(2)} discount
              </div>
            </div>
          </div>

          <button
            onClick={handleRedeem}
            disabled={redeeming || !balance || redeemAmount < 500 || redeemAmount > (balance?.totalPoints || 0)}
            className="w-full px-6 py-3 text-white rounded-md font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#fab242' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
          >
            {redeeming ? 'Processing...' : `Redeem ${redeemAmount} Points`}
          </button>

          <p className="text-xs text-gray-500">
            * Coupon will be valid for 90 days from redemption
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h3>
        
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-4">
            {history.map((transaction) => (
              <div
                key={transaction._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.reason}</p>
                    <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {transaction.type === 'earned' ? '+' : '-'}
                    {Math.abs(transaction.points)} pts
                  </p>
                  <p className="text-xs text-gray-500">Balance: {transaction.balanceAfter} pts</p>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Points;

