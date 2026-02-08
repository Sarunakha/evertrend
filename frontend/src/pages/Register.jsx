import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser } from 'react-icons/fi';
import loginImage from '../assets/login-image.jpg';
import GoogleAuth from '../components/GoogleAuth';

const Register = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: roleParam === 'Seller' ? 'Seller' : 'Buyer'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState(null);
  const { register, loginWithGoogle, fetchUser } = useAuth();
  const navigate = useNavigate();
  
  // If user is logged in as buyer and wants to become seller, pre-fill form
  useEffect(() => {
    if (user && user.role === 'Buyer' && roleParam === 'Seller') {
      setFormData(prev => ({
        ...prev,
        username: user.username,
        email: user.email,
        role: 'Seller'
      }));
    }
  }, [user, roleParam]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const registerResult = await register(formData);
      setResult(registerResult);
      
      if (registerResult.success) {
        setSuccess(true);
        // Redirect to verify email page if verification is required
        if (registerResult.requiresVerification && !registerResult.developmentMode) {
          setTimeout(() => {
            navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
          }, 2000);
        } else if (!registerResult.developmentMode) {
          // Otherwise redirect to login
          setTimeout(() => {
            navigate('/login?registered=true');
          }, 2000);
        } else {
          // In development mode, don't redirect - show OTP on page
          setLoading(false);
        }
      } else {
        setError(registerResult.message || 'Registration failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
            <p className="text-gray-700 font-medium">Creating your account...</p>
          </div>
        </div>
      )}

      {/* Left Section - Image with Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-85"
          style={{
            backgroundImage: `url(${loginImage})`
          }}
        />
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-black">
          <h1 className="text-7xl font-bold mb-4 tracking-tight">EVERTREND</h1>
          <p className="text-2xl font-light">Curating the styles of tomorrow, today.</p>
        </div>
      </div>

      {/* Right Section - Register Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {user && user.role === 'Buyer' && roleParam === 'Seller' 
                ? 'Upgrade to Seller Account' 
                : 'Create your account'}
            </h2>
            <p className="mt-2 text-gray-600">
              {user && user.role === 'Buyer' && roleParam === 'Seller'
                ? 'Your account will be upgraded to Seller. Use your existing credentials.'
                : 'Please enter your details to get started.'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {success && (
              <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md">
                {result?.developmentMode 
                  ? 'Account created! Check server console for verification code (development mode).'
                  : 'Account created successfully! Redirecting to verification...'}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            {result?.developmentMode && result?.verificationOTP && (
              <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded-md">
                <p className="font-semibold mb-2">Development Mode - Verification Code:</p>
                <p className="text-2xl font-bold text-center">{result.verificationOTP}</p>
                <p className="text-sm mt-2">Use this code to verify your email</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Username Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="username"
                  type="text"
                  required
                  disabled={user && user.role === 'Buyer' && roleParam === 'Seller'}
                  className="block w-full pl-10 pr-3 py-3 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
                  style={{ borderColor: '#b4b4b4' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              {/* Email Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  disabled={user && user.role === 'Buyer' && roleParam === 'Seller'}
                  className="block w-full pl-10 pr-3 py-3 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
                  style={{ borderColor: '#b4b4b4' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  type="password"
                  required={!user || user.role !== 'Buyer' || roleParam !== 'Seller'}
                  className="block w-full pl-10 pr-3 py-3 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition"
                  style={{ 
                    borderColor: '#b4b4b4',
                    '--tw-ring-color': '#fab242'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder={user && user.role === 'Buyer' && roleParam === 'Seller' ? 'Password (optional for upgrade)' : 'Password'}
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              {/* Role Selection */}
              {(!user || user.role !== 'Buyer' || roleParam !== 'Seller') && (
                <div>
                  <select
                    name="role"
                    className="block w-full px-3 py-3 border rounded-md text-gray-900 focus:outline-none focus:ring-2 transition"
                    style={{ borderColor: '#b4b4b4' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#fab242';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#b4b4b4';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="Buyer">Buyer</option>
                    <option value="Seller">Seller</option>
                  </select>
                </div>
              )}
              {user && user.role === 'Buyer' && roleParam === 'Seller' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    Your account will be upgraded to <strong>Seller</strong> role. You can switch between Buyer and Seller views in your profile.
                  </p>
                </div>
              )}
            </div>

            {/* Sign Up Button */}
            <div>
              <button
                type="submit"
                disabled={loading || success}
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
                    Creating account...
                  </span>
                ) : success ? (
                  'Account Created!'
                ) : (
                  'SIGN UP'
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign Up Button */}
            <div>
              <GoogleAuth
                buttonText="signup_with"
                onSuccess={async (userData) => {
                  setLoading(true);
                  try {
                    await loginWithGoogle(userData);
                    setSuccess(true);
                    setLoading(false);
                    // Redirect after a short delay
                    setTimeout(() => {
                      navigate('/');
                    }, 1500);
                  } catch (error) {
                    setError('Failed to complete Google sign-up. Please try again.');
                    setLoading(false);
                  }
                }}
                onError={(errorMessage) => {
                  // Only set error for actual authentication errors, not configuration errors
                  if (errorMessage && !errorMessage.includes('not configured') && !errorMessage.includes('Client ID')) {
                    setError(errorMessage);
                    setLoading(false);
                  }
                }}
              />
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
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

export default Register;
