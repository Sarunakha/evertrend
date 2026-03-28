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
    return location.pathname.includes('/dashboard/buyer') ? 'buyer' : 'seller';
  });

  useEffect(() => {
    // Sync current view with route - only update if actually on seller dashboard
    if (location.pathname.includes('/dashboard/seller')) {
      setCurrentView('seller');
    } else if (location.pathname.includes('/dashboard/buyer')) {
      setCurrentView('buyer');
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
      await api.put(`/users/${user._id}`, formData);
      await fetchUser();
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSwitch = (view) => {
    // Don't navigate if already on the correct view
    if (view === 'seller' && location.pathname.includes('/dashboard/seller')) {
      return;
    }
    if (view === 'buyer' && location.pathname.includes('/dashboard/buyer')) {
      return;
    }
    
    setCurrentView(view);
    // Get the current sub-route (e.g., 'profile', 'products', 'orders', 'stats')
    const currentPath = location.pathname;
    const subRoute = currentPath.split('/').pop() || 'profile';
    
    if (view === 'seller') {
      navigate(`/dashboard/seller/${subRoute}`);
    } else {
      // For buyer dashboard, only allow 'profile' and 'orders'
      const buyerSubRoute = (subRoute === 'profile' || subRoute === 'orders') ? subRoute : 'profile';
      navigate(`/dashboard/buyer/${buyerSubRoute}`);
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
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={currentView === 'buyer' ? { backgroundColor: '#fab242' } : {}}
              >
                <FiUser className="h-4 w-4" />
                <span>Buyer</span>
              </button>
              <button
                onClick={() => handleViewSwitch('seller')}
                className={`px-4 py-2 rounded-md flex items-center space-x-2 transition ${
                  currentView === 'seller'
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={currentView === 'seller' ? { backgroundColor: '#fab242' } : {}}
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
            message.includes('successfully')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
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

