import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FiShoppingBag, FiShoppingCart, FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';
import logo from '../assets/logo1.png';
import LogoutModal from './LogoutModal';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { getCartItemCount } = useCart();
  const navigate = useNavigate();
  const cartItemCount = getCartItemCount();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showShopDropdown, setShowShopDropdown] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'Admin') return '/dashboard/admin';
    if (user.role === 'Seller') return '/dashboard/seller';
    return '/dashboard/buyer';
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <FiShoppingBag className="h-6 w-6" style={{ color: '#fab242' }} />
              <img 
                src={logo} 
                alt="EverTrend Logo" 
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {/* Shop Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setShowShopDropdown(true)}
                onMouseLeave={() => setShowShopDropdown(false)}
              >
                <button
                  className="flex items-center text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
                  style={{ color: '#000000' }}
                >
                  Shop
                  <FiChevronDown className="ml-1 h-4 w-4" />
                </button>
                
                {/* Dropdown Menu */}
                {showShopDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-4 z-50">
                    {/* Clothing Section */}
                    <div className="px-4 mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Clothing</h3>
                      <div className="space-y-1">
                        <Link
                          to="/products?category=Tops"
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition"
                          onClick={() => setShowShopDropdown(false)}
                        >
                          Tops
                        </Link>
                        <Link
                          to="/products?category=Bottoms"
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition"
                          onClick={() => setShowShopDropdown(false)}
                        >
                          Bottoms
                        </Link>
                        <Link
                          to="/products?category=Dresses"
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition"
                          onClick={() => setShowShopDropdown(false)}
                        >
                          Dresses
                        </Link>
                        <Link
                          to="/products?category=Outerwear"
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition"
                          onClick={() => setShowShopDropdown(false)}
                        >
                          Outerwear
                        </Link>
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 my-4"></div>
                    
                    {/* Accessories Section */}
                    <div className="px-4 mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Accessories</h3>
                      <Link
                        to="/products?category=Accessories"
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition"
                        onClick={() => setShowShopDropdown(false)}
                      >
                        All Accessories
                      </Link>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 my-4"></div>
                    
                    {/* Shoes Section */}
                    <div className="px-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shoes</h3>
                      <Link
                        to="/products?category=Shoes"
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition"
                        onClick={() => setShowShopDropdown(false)}
                      >
                        All Shoes
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              
              <Link to="/about" className="text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition" style={{ color: '#000000' }}>
                About
              </Link>
              <Link to="/virtual-try-on" className="text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition" style={{ color: '#000000' }}>
                Virtual Try Out
              </Link>
              <Link to="/contact" className="text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition" style={{ color: '#000000' }}>
                Contact
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Cart Button - Rightmost */}
            <Link
              to="/cart"
              className="relative flex items-center text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
              style={{ color: '#000000' }}
            >
              <FiShoppingCart className="h-5 w-5" style={{ color: '#fab242' }} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" style={{ backgroundColor: '#fab242' }}>
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <>
                <Link
                  to={getDashboardLink()}
                  className="flex items-center space-x-1 text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
                  style={{ color: '#000000' }}
                >
                  <FiUser className="h-5 w-5" style={{ color: '#fab242' }} />
                  <span>{user.username}</span>
                </Link>
                {/* Show Seller Dashboard link if user is Seller/Admin, or show upgrade option for Buyers */}
                {user.role === 'Seller' || user.role === 'Admin' ? (
                  <Link
                    to="/dashboard/seller/products"
                    className="flex items-center space-x-1 text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
                    style={{ color: '#000000' }}
                  >
                    <FiShoppingBag className="h-5 w-5" style={{ color: '#fab242' }} />
                    <span>Seller</span>
                  </Link>
                ) : (
                  <Link
                    to="/dashboard/buyer/profile"
                    className="flex items-center space-x-1 text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
                    style={{ color: '#000000' }}
                    title="Upgrade to Seller"
                  >
                    <FiShoppingBag className="h-5 w-5" style={{ color: '#fab242', opacity: 0.6 }} />
                    <span className="text-xs">Become Seller</span>
                  </Link>
                )}
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center space-x-1 text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
                  style={{ color: '#000000' }}
                >
                  <FiLogOut className="h-5 w-5" style={{ color: '#fab242' }} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-gray-900 hover:text-primary px-3 py-2 text-sm font-medium transition"
                  style={{ color: '#000000' }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition"
                  style={{ 
                    backgroundColor: '#fab242',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </nav>
  );
};

export default Navbar;
