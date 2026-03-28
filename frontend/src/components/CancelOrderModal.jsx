import { useState } from 'react';
import { FiX } from 'react-icons/fi';

const CANCELLATION_REASONS = [
  'Changed my mind',
  'Found a better price',
  'Ordered by mistake',
  'Delivery time is too long',
  'Other'
];

const CancelOrderModal = ({ order, onClose, onSubmit, submitting }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {order && (
            <p className="text-sm text-gray-600 mb-4">
              Order #{order._id?.toString().slice(-8)} • Rs. {order.totalAmount?.toFixed(2) || '0.00'}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for cancellation *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Select a reason</option>
              {CANCELLATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="px-4 py-2 text-white rounded-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#fab242' }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
