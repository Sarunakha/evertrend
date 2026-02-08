import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiCopy, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../../../utils/api';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    description: '',
    minPurchaseAmount: '',
    maxDiscountAmount: '',
    validUntil: '',
    usageLimit: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, [page]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/coupons?page=${page}&limit=10`);
      console.log('Coupons API response:', response.data); // Debug log
      if (response.data.success) {
        setCoupons(response.data.data || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setError(response.data.message || 'Failed to load coupons');
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      console.error('Error response:', error.response?.data); // Debug log
      setError(error.response?.data?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Ensure validUntil is properly formatted
      let validUntilDate = formData.validUntil;
      if (validUntilDate) {
        // If it's already in YYYY-MM-DD format, ensure it's treated as ISO date
        const date = new Date(validUntilDate);
        if (!isNaN(date.getTime())) {
          // Convert to ISO string format
          validUntilDate = date.toISOString().split('T')[0];
        }
      }

      const payload = {
        code: formData.code.trim(),
        type: formData.type,
        value: parseFloat(formData.value),
        description: formData.description?.trim() || '',
        minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : 0,
        maxDiscountAmount: formData.maxDiscountAmount && formData.maxDiscountAmount.trim() ? parseFloat(formData.maxDiscountAmount) : null,
        validUntil: validUntilDate,
        usageLimit: formData.usageLimit && formData.usageLimit.trim() ? parseInt(formData.usageLimit) : null
      };

      // Validate required fields
      if (!payload.code || !payload.type || !payload.value || !payload.validUntil) {
        setError('Please fill in all required fields');
        return;
      }

      const response = await api.post('/coupons', payload);
      if (response.data.success) {
        setSuccess('Coupon created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchCoupons();
      } else {
        setError(response.data.message || 'Failed to create coupon');
      }
    } catch (error) {
      console.error('Create coupon error:', error);
      // Handle validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message || (err.param ? `${err.param}: ${err.msg}` : 'Validation error')).join(', ');
        setError(errorMessages || 'Validation failed. Please check your input.');
      } else {
        setError(error.response?.data?.message || 'Failed to create coupon. Please try again.');
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        description: formData.description,
        minPurchaseAmount: parseFloat(formData.minPurchaseAmount) || 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        validUntil: formData.validUntil,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        isActive: editingCoupon.isActive
      };

      const response = await api.put(`/coupons/${editingCoupon._id}`, payload);
      if (response.data.success) {
        setSuccess('Coupon updated successfully!');
        setEditingCoupon(null);
        resetForm();
        fetchCoupons();
      } else {
        setError(response.data.message || 'Failed to update coupon');
      }
    } catch (error) {
      console.error('Update coupon error:', error);
      setError(error.response?.data?.message || 'Failed to update coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      const response = await api.delete(`/coupons/${id}`);
      if (response.data.success) {
        setSuccess('Coupon deleted successfully!');
        fetchCoupons();
      } else {
        setError(response.data.message || 'Failed to delete coupon');
      }
    } catch (error) {
      console.error('Delete coupon error:', error);
      setError(error.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description || '',
      minPurchaseAmount: coupon.minPurchaseAmount || '',
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
      usageLimit: coupon.usageLimit || ''
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      description: '',
      minPurchaseAmount: '',
      maxDiscountAmount: '',
      validUntil: '',
      usageLimit: ''
    });
    setEditingCoupon(null);
  };

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isCouponValid = (coupon) => {
    const now = new Date();
    return (
      coupon.isActive &&
      now >= new Date(coupon.validFrom) &&
      now <= new Date(coupon.validUntil) &&
      (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coupon Management</h2>
          <p className="text-gray-600">Create and manage discount coupons for your customers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center space-x-2 px-6 py-3 text-white rounded-md font-semibold transition"
          style={{ backgroundColor: '#fab242' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
        >
          <FiPlus className="h-5 w-5" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Coupons List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No coupons created yet</p>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className={`p-4 border-2 rounded-lg ${
                  isCouponValid(coupon)
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-bold text-xl text-gray-900">{coupon.code}</span>
                      {isCouponValid(coupon) ? (
                        <FiCheckCircle className="text-green-500" title="Active" />
                      ) : (
                        <FiXCircle className="text-red-500" title="Inactive/Expired" />
                      )}
                      <button
                        onClick={() => copyCouponCode(coupon.code)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Copy code"
                      >
                        <FiCopy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {coupon.type === 'percentage' ? `${coupon.value}% off` : `Rs.${coupon.value} off`}
                      {coupon.description && ` - ${coupon.description}`}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Min: Rs.{coupon.minPurchaseAmount}</span>
                      {coupon.maxDiscountAmount && (
                        <span>Max: Rs.{coupon.maxDiscountAmount}</span>
                      )}
                      <span>Valid until: {formatDate(coupon.validUntil)}</span>
                      <span>Used: {coupon.usedCount} / {coupon.usageLimit || '∞'}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Edit"
                    >
                      <FiEdit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h3>

              <form onSubmit={editingCoupon ? handleUpdate : handleCreate} className="space-y-4">
                {!editingCoupon && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent uppercase"
                      placeholder="SUMMER2024"
                    />
                  </div>
                )}

                {!editingCoupon && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                )}

                {!editingCoupon && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value * {formData.type === 'percentage' ? '(1-100)' : '(in Rs.)'}
                    </label>
                    <input
                      type="number"
                      name="value"
                      value={formData.value}
                      onChange={handleInputChange}
                      required
                      min={formData.type === 'percentage' ? 1 : 0.01}
                      max={formData.type === 'percentage' ? 100 : undefined}
                      step={formData.type === 'percentage' ? 1 : 0.01}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={formData.type === 'percentage' ? '10' : '500'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Coupon description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Purchase (Rs.)
                    </label>
                    <input
                      type="number"
                      name="minPurchaseAmount"
                      value={formData.minPurchaseAmount}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {formData.type === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Discount (Rs.)
                      </label>
                      <input
                        type="number"
                        name="maxDiscountAmount"
                        value={formData.maxDiscountAmount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="No limit"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until *
                    </label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-white rounded-md font-semibold transition"
                    style={{ backgroundColor: '#fab242' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                  >
                    {editingCoupon ? 'Update' : 'Create'} Coupon
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;

