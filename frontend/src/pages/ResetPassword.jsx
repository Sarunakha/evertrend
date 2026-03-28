import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import loginImage from '../assets/login-image.jpg';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put(`/auth/reset-password/${token}`, {
        password: formData.password
      });
      setMessage(response.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
            Invalid reset token. Please request a new password reset link.
          </div>
          <Link
            to="/forgot-password"
            className="block text-center font-semibold transition"
            style={{ color: '#fab242' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Image with Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${loginImage})`
          }}
        />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-black">
          <h1 className="text-7xl font-bold mb-4 tracking-tight">EVERTREND</h1>
          <h1 className="text-7xl font-bold mb-8 tracking-tight">EVERTREND</h1>
          <p className="text-2xl font-light">Curating the styles of tomorrow, today.</p>
        </div>
      </div>

      {/* Right Section - Reset Password Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link
              to="/login"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <FiArrowLeft className="mr-2" />
              Back to Login
            </Link>
            <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-gray-600">
              Enter your new password below.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {message && (
              <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md">
                {message}
                <p className="mt-2 text-sm">Redirecting to login page...</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength="6"
                    className="block w-full pl-10 pr-3 py-3 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition"
                    style={{ borderColor: '#b4b4b4' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#fab242';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#b4b4b4';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength="6"
                    className="block w-full pl-10 pr-3 py-3 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition"
                    style={{ borderColor: '#b4b4b4' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#fab242';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#b4b4b4';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !!message}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{ backgroundColor: '#fab242' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link 
                  to="/login" 
                  className="font-medium transition"
                  style={{ color: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

