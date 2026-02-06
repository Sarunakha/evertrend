import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Footer from '../components/Footer';
import bannerImage from '../assets/banner-image.png';

const Home = () => {
  const { user } = useAuth();
  const [thriftProducts, setThriftProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [thriftResponse, newArrivalsResponse] = await Promise.all([
          api.get('/products?condition=Good&limit=8'),
          api.get('/products?sortBy=createdAt&sortOrder=desc&limit=8')
        ]);
        setThriftProducts(thriftResponse.data.data || []);
        setNewArrivals(newArrivalsResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Banner Image */}
      <div className="relative h-[600px] md:h-[700px] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${bannerImage})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
              Sustainable Fashion<br />
              Pre-Loved, Pre-Loved Style
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white leading-relaxed max-w-2xl mx-auto drop-shadow-md">
              Discover unique, quality clothing that's good for your wallet and the planet. Shop second-hand fashion that makes a difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="px-8 py-4 rounded-lg text-lg font-semibold transition text-center shadow-lg text-white"
                style={{ backgroundColor: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
              >
                Shop Now
              </Link>
              {(!user || (user.role !== 'Seller' && user.role !== 'Admin')) && (
                <Link
                  to="/register?role=Seller"
                  className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/30 transition text-center border-2 border-white"
                >
                  Become a Seller
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Sections */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Thrift Products Section */}
          <div className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Thrift Finds</h2>
                <p className="text-gray-600">Pre-loved fashion that's good for you and the planet</p>
              </div>
              <Link
                to="/products?condition=Good"
                className="font-semibold transition"
                style={{ color: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
              >
                View All →
              </Link>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
              </div>
            ) : thriftProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {thriftProducts.map((product) => {
                  const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0 
                    ? product.images.find(img => img && img.trim() !== '') || product.images[0]
                    : null;
                  
                  return (
                    <Link
                      key={product._id}
                      to={`/products/${product._id}`}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.description ? `${product.name || 'Product'} - ${product.description}` : product.name || 'Product'}
                          className="w-full h-80 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="320"%3E%3Crect fill="%23e5e7eb" width="400" height="320"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage failed to load%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
                          <p className="text-gray-400 text-sm">No image</p>
                        </div>
                      )}
                      <div className="p-4 bg-white">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900">{product.name || 'Product'}</h3>
                        <p className="text-gray-600 text-sm mb-2">{product.category || 'N/A'} • {product.size || 'N/A'}</p>
                        <p className="font-bold text-xl" style={{ color: '#fab242' }}>Rs.{product.price || '0'}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No thrift products available at the moment.</p>
              </div>
            )}
          </div>

          {/* New Arrivals Section */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">New Arrivals</h2>
                <p className="text-gray-600">Fresh additions to our collection</p>
              </div>
              <Link
                to="/products?sortBy=createdAt&sortOrder=desc"
                className="font-semibold transition"
                style={{ color: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
              >
                View All →
              </Link>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
              </div>
            ) : newArrivals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {newArrivals.map((product) => {
                  const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0 
                    ? product.images.find(img => img && img.trim() !== '') || product.images[0]
                    : null;
                  
                  return (
                    <Link
                      key={product._id}
                      to={`/products/${product._id}`}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.description ? `${product.name || 'Product'} - ${product.description}` : product.name || 'Product'}
                          className="w-full h-80 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="320"%3E%3Crect fill="%23e5e7eb" width="400" height="320"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage failed to load%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
                          <p className="text-gray-400 text-sm">No image</p>
                        </div>
                      )}
                      <div className="p-4 bg-white">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900">{product.name || 'Product'}</h3>
                        <p className="text-gray-600 text-sm mb-2">{product.category || 'N/A'} • {product.size || 'N/A'}</p>
                        <p className="font-bold text-xl" style={{ color: '#fab242' }}>Rs.{product.price || '0'}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No new arrivals at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Home;
