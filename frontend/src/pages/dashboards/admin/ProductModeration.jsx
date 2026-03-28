import { useState, useEffect } from 'react';
import { Flag, Trash2, Search, Package } from 'lucide-react';
import api from '../../../utils/api';
import DangerZone from '../../../components/DangerZone';

const ProductModeration = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dangerZone, setDangerZone] = useState({ isOpen: false, action: null, product: null });

  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm, flaggedOnly]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (searchTerm) params.append('search', searchTerm);
      if (flaggedOnly) params.append('flagged', 'true');

      const response = await api.get(`/admin/products?${params}`);
      if (response.data.success) {
        setProducts(response.data.data);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async (productId, flagged) => {
    try {
      const response = await api.put(`/admin/products/${productId}/flag`, { flagged });
      if (response.data.success && response.data.data) {
        setProducts((prev) =>
          prev.map((p) => (p._id === productId ? { ...p, ...response.data.data } : p))
        );
      }
    } catch (error) {
      console.error('Error flagging product:', error);
      alert(error.response?.data?.message || 'Failed to update product flag');
    }
  };

  const handleDelete = async (productId) => {
    try {
      const response = await api.delete(`/admin/products/${productId}`);
      if (response.data.success) {
        fetchProducts();
        setDangerZone({ isOpen: false, action: null, product: null });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const openDangerZone = (action, product) => {
    setDangerZone({ isOpen: true, action, product });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">Product Moderation</h2>
        </div>
      </div>
      <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        Flagged items are <span className="font-semibold">hidden from the public shop</span> until
        unflagged. Sellers receive a notification when a product is flagged.
      </p>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => {
                setFlaggedOnly(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">Show flagged only</span>
          </label>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
          No products found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition ${
                product.flaggedForReview ? 'border-2 border-orange-500' : ''
              }`}
            >
              {product.images && product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                  {product.flaggedForReview && (
                    <span
                      className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded"
                      title="Not visible on Shop / All Products"
                    >
                      Flagged · hidden from shop
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">Rs. {product.price}</p>
                <p className="text-xs text-gray-500 mb-4">
                  Seller: {product.sellerId?.username || 'Unknown'}
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFlag(product._id, !product.flaggedForReview)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition ${
                      product.flaggedForReview
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    } flex items-center justify-center space-x-1`}
                  >
                    <Flag className="h-4 w-4" />
                    <span>{product.flaggedForReview ? 'Unflag' : 'Flag'}</span>
                  </button>
                  <button
                    onClick={() => openDangerZone('delete', product)}
                    className="px-3 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-md px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Danger Zone Modal */}
      <DangerZone
        isOpen={dangerZone.isOpen}
        onClose={() => setDangerZone({ isOpen: false, action: null, product: null })}
        onConfirm={() => {
          if (dangerZone.action === 'delete' && dangerZone.product) {
            handleDelete(dangerZone.product._id);
          }
        }}
        title="Delete Product Permanently"
        message={`Are you sure you want to permanently delete "${dangerZone.product?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete Permanently"
      />
    </div>
  );
};

export default ProductModeration;

