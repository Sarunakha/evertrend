import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FiMail, FiLock, FiRefreshCw } from 'react-icons/fi';
import loginImage from '../assets/login-image.jpg';
import GoogleAuth from '../components/GoogleAuth';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { login, loginWithGoogle, user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Only redirect if user is logged in and we're showing success animation
    if (user && user.role && showSuccessAnimation) {
      const redirect = searchParams.get('redirect');
      
      // Determine dashboard route based on user role
      const getDashboardRoute = () => {
        if (redirect) return redirect;
        if (user.role === 'Admin') return '/dashboard/admin';
        if (user.role === 'Seller') return '/dashboard/seller';
        if (user.role === 'Buyer') return '/dashboard/buyer';
        return '/';
      };
      
      // Delay redirect to show success animation
      const redirectTimer = setTimeout(() => {
        const dashboardRoute = getDashboardRoute();
        navigate(dashboardRoute);
      }, 1500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, showSuccessAnimation, navigate, searchParams]);

  useEffect(() => {
    // Check if user just registered
    const registered = searchParams.get('registered');
    if (registered === 'true') {
      // Show success message briefly
      setTimeout(() => {
        searchParams.delete('registered');
        navigate(`/login?${searchParams.toString()}`, { replace: true });
      }, 3000);
    }
  }, [searchParams, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Don't clear error on input change - let user see the error message
    // Error will only clear on new submission attempt
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRequiresVerification(false);
    setShowSuccessAnimation(false);
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      setLoading(false);
      // Wait a bit for user state to update, then show success animation
      setTimeout(() => {
        setShowSuccessAnimation(true);
      }, 100);
      // Don't navigate immediately - let useEffect handle it after animation
    } else {
      setLoading(false);
      // Check if error is about email verification
      if (result.requiresVerification) {
        setRequiresVerification(true);
        setUnverifiedEmail(result.email || formData.email);
        setError(result.message || 'Please verify your email address to continue.');
        // Keep verification error visible longer (5 seconds) as it has action buttons
        setTimeout(() => {
          setError('');
          setRequiresVerification(false);
        }, 5000);
      } else {
        setError(result.message);
        // Show error message for 1.5 seconds, then clear it
        setTimeout(() => {
          setError('');
        }, 2000);
      }
    }
  };

  const registered = searchParams.get('registered') === 'true';

  return (
    <div className="min-h-screen flex">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#fab242' }}></div>
            <p className="text-gray-700 font-medium">Signing you in...</p>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg p-12 flex flex-col items-center space-y-6 shadow-2xl">
            {/* Success Checkmark Animation */}
            <div className="relative checkmark-container">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <svg 
                  className="w-12 h-12 text-white checkmark-svg" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 w-20 h-20 bg-green-500 rounded-full animate-ping opacity-20"></div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Login Successful!</h3>
              <p className="text-gray-600">Redirecting you now...</p>
            </div>
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

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-gray-600">Please enter your details to sign in.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {registered && (
              <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md">
                Registration successful! Please sign in with your credentials.
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md animate-fade-in">
                <div className="flex items-start">
                  <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">{error}</p>
                    {requiresVerification && (
                      <div className="mt-3 flex flex-col space-y-2">
                        <button
                          onClick={async () => {
                            setResending(true);
                            try {
                              await api.post('/auth/resend-verification', { email: unverifiedEmail });
                              setError('Verification email sent! Please check your inbox.');
                            } catch (err) {
                              setError(err.response?.data?.message || 'Error sending verification email');
                            } finally {
                              setResending(false);
                            }
                          }}
                          disabled={resending}
                          className="flex items-center justify-center space-x-2 text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
                        >
                          {resending ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <FiRefreshCw className="h-4 w-4" />
                              <span>Resend Verification Email</span>
                            </>
                          )}
                        </button>
                        <Link
                          to={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                          className="text-sm font-medium text-red-700 hover:text-red-800 text-center"
                        >
                          Go to Verification Page
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
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
                  required
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
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 border rounded focus:ring-2 transition"
                  style={{ 
                    borderColor: '#b4b4b4',
                    accentColor: '#fab242'
                  }}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link 
                  to="/forgot-password" 
                  className="font-medium transition"
                  style={{ color: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Login Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
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
                    Signing in...
                  </span>
                ) : (
                  'LOG IN'
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

            {/* Google Sign In Button */}
            <div>
              <GoogleAuth
                buttonText="signin_with"
                onSuccess={async (userData) => {
                  setLoading(true);
                  try {
                    await loginWithGoogle(userData);
                    setShowSuccessAnimation(true);
                    setLoading(false);
                  } catch (error) {
                    setError('Failed to complete Google sign-in. Please try again.');
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

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                New to Evertrend?{' '}
                <Link 
                  to="/register" 
                  className="font-medium transition"
                  style={{ color: '#fab242' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
                >
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
