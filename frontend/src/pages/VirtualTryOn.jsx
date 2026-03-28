import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FiArrowLeft } from 'react-icons/fi';

const VirtualTryOnPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products?limit=50');
        const data = response.data.data || [];
        setProducts(
          data.filter(
            (p) =>
              p.dimensions &&
              (p.dimensions.shoulder != null ||
                p.dimensions.chest != null ||
                p.dimensions.length != null)
          )
        );
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const goToBuyerTryOn = (product) => {
    navigate(`/dashboard/buyer/try-on?productId=${product._id}`, {
      state: { productId: product._id, vtoImage: product.vtoImage || null }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to use Virtual Try-On.</p>
          <Link
            to={`/login?redirect=${encodeURIComponent('/dashboard/buyer/try-on')}`}
            className="inline-block px-6 py-2 text-white rounded-md font-medium"
            style={{ backgroundColor: '#fab242' }}
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          to="/products"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft className="mr-2" />
          Back to Products
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Virtual Try-On</h1>
        <p className="text-gray-600 mb-8">
          Products with size dimensions can be viewed here. Select a product to see its measurements and check fit.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-amber-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p>No products with dimensions available for try-on.</p>
            <Link to="/products" className="text-amber-600 hover:underline mt-2 inline-block">
              Browse all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const img = product.images?.[0];
              return (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => goToBuyerTryOn(product)}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition text-left"
                >
                  <div className="aspect-square bg-gray-100">
                    {img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Rs. {product.price}</p>
                    <span className="text-xs text-amber-600 font-medium">View dimensions →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualTryOnPage;
