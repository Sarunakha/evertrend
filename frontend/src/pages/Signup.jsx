import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiShield } from 'react-icons/fi';
import loginImage from '../assets/login-image.jpg';

const Signup = () => {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const { sendOTP, registerVerified } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email before sending OTP
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const result = await sendOTP(formData.email);
      
      if (result.success) {
        setIsOtpSent(true);
        setOtpSentMessage(result.message);
        if (result.otp) {
          // In development mode, show OTP
          console.log('Development OTP:', result.otp);
        }
      } else {
        setError(result.message || 'Failed to send verification code. Please try again.');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate all fields
    if (!formData.name || formData.name.trim().length < 3) {
      setError('Full name must be at least 3 characters.');
      setLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (!formData.otp || formData.otp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      setLoading(false);
      return;
    }

    try {
      const result = await registerVerified({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        otp: formData.otp
      });

      if (result.success) {
        setSuccess(true);
        // Redirect to dashboard or home after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);
    setIsOtpSent(false);
    setFormData(prev => ({ ...prev, otp: '' }));

    try {
      const result = await sendOTP(formData.email);
      
      if (result.success) {
        setIsOtpSent(true);
        setOtpSentMessage('New verification code sent to your email.');
        if (result.otp) {
          console.log('Development OTP:', result.otp);
        }
      } else {
        setError(result.message || 'Failed to resend verification code. Please try again.');
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
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
            <p className="text-gray-700 font-medium">
              {isOtpSent ? 'Creating your account...' : 'Sending verification code...'}
            </p>
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

      {/* Right Section - Signup Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
            <p className="mt-2 text-gray-600">
              {isOtpSent 
                ? 'Enter the verification code sent to your email to complete registration.'
                : "Please enter your details to get started. We'll send you a verification code."}
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md">
              Account created successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {isOtpSent && otpSentMessage && (
            <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded-md">
              {otpSentMessage}
            </div>
          )}

          {!isOtpSent ? (
            // View 1: Email Input - User enters email and clicks "Send Verification Code"
            <form className="mt-8 space-y-6" onSubmit={handleSendOTP}>
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
              </div>

              {/* Send Verification Code Button */}
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
                      Sending...
                    </span>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </div>
            </form>
          ) : (
            // View 2: OTP & Details - Show fields for OTP, Full Name, and Password
            <form className="mt-8 space-y-6" onSubmit={handleCompleteRegistration}>
              <div className="space-y-4">
                {/* OTP Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiShield className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="block w-full pl-10 pr-3 py-3 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 transition text-center text-2xl tracking-widest"
                    style={{ borderColor: '#b4b4b4' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#fab242';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#b4b4b4';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder="000000"
                    value={formData.otp}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, otp: value });
                      setError('');
                    }}
                  />
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    Enter the 6-digit code sent to {formData.email}
                  </p>
                </div>

                {/* Full Name Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="name"
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
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
                    placeholder="Full Name"
                    value={formData.name}
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
                    minLength={6}
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
                    placeholder="Password (min. 6 characters)"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Complete Registration Button - Disabled until OTP has 6 digits */}
              <div>
                <button
                  type="submit"
                  disabled={loading || success || formData.otp.length !== 6}
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
                    'Complete Registration'
                  )}
                </button>
              </div>

              {/* Resend OTP Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm transition"
                  style={{ color: '#fab242' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = '#d19c49')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = '#fab242')}
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </form>
          )}

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
        </div>
      </div>
    </div>
  );
};

export default Signup;

