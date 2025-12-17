import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import VirtualTryOn from '../components/VirtualTryOn';
import Footer from '../components/Footer';
import { FiShoppingBag, FiUser } from 'react-icons/fi';

const VirtualTryOnPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showTryOn, setShowTryOn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=12');
      setProducts(response.data.data.filter(p => p.dimensions));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTryOn = (product) => {
    if (!user) {
      // Redirect to login if not authenticated
      const returnUrl = `/virtual-try-on?product=${product._id}`;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }
    setSelectedProduct(product);
    setShowTryOn(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Virtual Try-On
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            Find your perfect fit with our AI-powered fit recommendation technology
          </p>
          {!user && (
            <div className="rounded-lg p-6 max-w-2xl mx-auto" style={{ backgroundColor: '#f1f3f9', borderColor: '#c2c9d6', borderWidth: '1px', borderStyle: 'solid' }}>
              <p className="mb-4 text-lg font-semibold" style={{ color: '#000000' }}>
                <FiUser className="inline h-5 w-5 mr-2" style={{ color: '#fab242' }} />
                Login Required
              </p>
              <p className="mb-4" style={{ color: '#000000' }}>
                You must be signed in to use the Virtual Try-On feature. Sign in to save your size profile and get personalized fit recommendations.
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  to="/login"
                  className="px-6 py-2 text-white rounded-md font-semibold transition"
                  style={{ backgroundColor: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 text-white rounded-md font-semibold transition"
                  style={{ backgroundColor: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
                <span className="text-2xl font-bold" style={{ color: '#fab242' }}>1</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Enter Your Measurements</h3>
              <p className="text-gray-600">
                Provide your shoulder width, chest width, and length measurements
              </p>
            </div>
            <div className="text-center">
            <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
              <span className="text-2xl font-bold" style={{ color: '#fab242' }}>2</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Select a Product</h3>
              <p className="text-gray-600">
                Browse products with available dimensions and click "Try On"
              </p>
            </div>
            <div className="text-center">
            <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
              <span className="text-2xl font-bold" style={{ color: '#fab242' }}>3</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Get Fit Recommendation</h3>
              <p className="text-gray-600">
                Receive a detailed fit percentage and breakdown by dimension
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Try On These Products</h2>
          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <FiShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                No products with dimensions available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  {product.images && product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-64 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{product.category} • {product.size}</p>
                    <p className="font-bold text-xl mb-4" style={{ color: '#fab242' }}>Rs.{product.price}</p>
                    <button
                      onClick={() => handleTryOn(product)}
                      className="w-full text-white px-4 py-2 rounded-md transition"
                      style={{ backgroundColor: '#fab242' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                    >
                      Try On
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Virtual Try-On Modal */}
        {showTryOn && selectedProduct && (
          <VirtualTryOn
            product={selectedProduct}
            onClose={() => {
              setShowTryOn(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default VirtualTryOnPage;

