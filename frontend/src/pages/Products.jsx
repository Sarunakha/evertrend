import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { FiSearch, FiFilter } from 'react-icons/fi';
import Footer from '../components/Footer';

const Products = () => {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || '';
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: categoryFromUrl,
    size: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Update filters when URL params change
  useEffect(() => {
    const category = searchParams.get('category') || '';
    setFilters(prev => ({ ...prev, category }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 12,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await api.get(`/products?${params}`);
      setProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="min-h-screen flex flex-col">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {filters.category ? `${filters.category}` : 'All Products'}
      </h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#b4b4b4' }} />
              <input
                type="text"
                name="search"
                placeholder="Search products..."
                className="pl-10 w-full px-3 py-2 border rounded-md transition"
                style={{ borderColor: '#b4b4b4' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#fab242';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#b4b4b4';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              name="category"
              className="w-full px-3 py-2 border rounded-md transition"
              style={{ borderColor: '#b4b4b4' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#fab242';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#b4b4b4';
                e.currentTarget.style.boxShadow = 'none';
              }}
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              <option value="Tops">Tops</option>
              <option value="Bottoms">Bottoms</option>
              <option value="Dresses">Dresses</option>
              <option value="Outerwear">Outerwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Shoes">Shoes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <select
              name="size"
              className="w-full px-3 py-2 border rounded-md transition"
              style={{ borderColor: '#b4b4b4' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#fab242';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#b4b4b4';
                e.currentTarget.style.boxShadow = 'none';
              }}
              value={filters.size}
              onChange={handleFilterChange}
            >
              <option value="">All Sizes</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="One Size">One Size</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              name="condition"
              className="w-full px-3 py-2 border rounded-md transition"
              style={{ borderColor: '#b4b4b4' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#fab242';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#b4b4b4';
                e.currentTarget.style.boxShadow = 'none';
              }}
              value={filters.condition}
              onChange={handleFilterChange}
            >
              <option value="">All Conditions</option>
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                {product.images && product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg flex-1">{product.name}</h3>
                    {product.stockQuantity === 0 && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded">
                        Out of Stock
                      </span>
                    )}
                    {product.stockQuantity > 0 && product.stockQuantity < 5 && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded">
                        Only {product.stockQuantity} left
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{product.category} • {product.size}</p>
                  <p className="font-bold text-xl" style={{ color: '#fab242' }}>Rs.{product.price}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center mt-8 space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#b4b4b4' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#f1f3f9')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ borderColor: '#b4b4b4' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#f1f3f9')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#ffffff')}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
    
    {/* Footer */}
    <Footer />
    </div>
  );
};

export default Products;

