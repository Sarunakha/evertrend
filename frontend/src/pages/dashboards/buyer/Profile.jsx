import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';
import { FiShoppingBag, FiUser } from 'react-icons/fi';

const Profile = () => {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    sizeProfile: { shoulder: '', chest: '', length: '' }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  // Initialize currentView based on the current route
  const [currentView, setCurrentView] = useState(() => {
    return location.pathname.includes('/dashboard/seller') ? 'seller' : 'buyer';
  });

  useEffect(() => {
    // Sync current view with route - only update if actually on buyer dashboard
    if (location.pathname.includes('/dashboard/buyer')) {
      setCurrentView('buyer');
    } else if (location.pathname.includes('/dashboard/seller')) {
      setCurrentView('seller');
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        sizeProfile: user.sizeProfile || { shoulder: '', chest: '', length: '' }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    if (e.target.name.startsWith('sizeProfile.')) {
      const field = e.target.name.split('.')[1];
      setFormData({
        ...formData,
        sizeProfile: {
          ...formData.sizeProfile,
          [field]: parseFloat(e.target.value) || ''
        }
      });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.put(`/users/${user._id}`, formData);
      
      // If role was upgraded and new token is provided, update it
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        await fetchUser(); // Refresh user data
      } else {
        await fetchUser();
      }
      
      setMessage(response.data.message || 'Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (!confirm('Are you sure you want to upgrade your account to Seller? This will allow you to list and sell products.')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await api.put(`/users/${user._id}`, { role: 'Seller' });
      
      // If role was upgraded and new token is provided, update it
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        await fetchUser(); // Refresh user data
        setMessage('Account upgraded to Seller successfully! Redirecting to Seller Dashboard...');
        // Redirect to seller dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard/seller/products');
        }, 2000);
      } else {
        await fetchUser();
        setMessage(response.data.message || 'Role upgraded successfully!');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error upgrading account');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSwitch = (view) => {
    // Don't navigate if already on the correct view
    if (view === 'buyer' && location.pathname.includes('/dashboard/buyer')) {
      return;
    }
    if (view === 'seller' && location.pathname.includes('/dashboard/seller')) {
      return;
    }
    
    setCurrentView(view);
    // Get the current sub-route (e.g., 'profile' or 'orders')
    const currentPath = location.pathname;
    const subRoute = currentPath.split('/').pop() || 'profile';
    
    if (view === 'seller') {
      navigate(`/dashboard/seller/${subRoute}`);
    } else {
      navigate(`/dashboard/buyer/${subRoute}`);
    }
  };

  const isSeller = user?.role === 'Seller' || user?.role === 'Admin';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Profile Management</h2>
        {isSeller && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Account View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleViewSwitch('buyer')}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition ${
                  currentView === 'buyer'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiUser className="h-4 w-4" />
                <span>Buyer</span>
              </button>
              <button
                onClick={() => handleViewSwitch('seller')}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition ${
                  currentView === 'seller'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiShoppingBag className="h-4 w-4" />
                <span>Seller</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-md ${
            message.includes('successfully') || message.includes('upgraded')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Become a Seller Section - Only show for Buyers */}
      {user?.role === 'Buyer' && (
        <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
                <FiShoppingBag className="h-6 w-6" style={{ color: '#fab242' }} />
                <span>Become a Seller</span>
              </h3>
              <p className="text-gray-700 mb-4">
                Upgrade your account to start selling products on EverTrend. As a seller, you can:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
                <li>List and manage your products</li>
                <li>Track your sales and orders</li>
                <li>View detailed statistics</li>
                <li>Switch between Buyer and Seller views</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpgradeToSeller}
            disabled={loading}
            className="text-white px-6 py-3 rounded-md font-semibold disabled:opacity-50 transition flex items-center space-x-2"
            style={{ backgroundColor: '#fab242' }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
            onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
          >
            <FiShoppingBag className="h-5 w-5" />
            <span>{loading ? 'Upgrading...' : 'Upgrade to Seller'}</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Size Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shoulder Width (cm)
              </label>
              <input
                type="number"
                name="sizeProfile.shoulder"
                value={formData.sizeProfile.shoulder}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chest Width (cm)
              </label>
              <input
                type="number"
                name="sizeProfile.chest"
                value={formData.sizeProfile.chest}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length (cm)
              </label>
              <input
                type="number"
                name="sizeProfile.length"
                value={formData.sizeProfile.length}
                onChange={handleChange}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Your size profile helps us provide better fit recommendations
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="text-white px-6 py-2 rounded-md disabled:opacity-50 transition"
          style={{ backgroundColor: '#fab242' }}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
          onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;

