import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { FiMail, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import loginImage from '../assets/login-image.jpg';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  
  const [email, setEmail] = useState(emailParam || '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendResult, setResendResult] = useState(null);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async () => {
    setError('');
    setMessage('');

    // Verify with token if available
    if (token) {
      setLoading(true);
      try {
        const response = await api.post('/auth/verify-email', { token });
        setMessage(response.data.message);
        setVerified(true);
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setError(error.response?.data?.message || 'Error verifying email');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Verify with OTP
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-email', { otp: otpString, email });
      setMessage(response.data.message);
      setVerified(true);
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Error verifying email');
      setOtp(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setMessage('');
    setResending(true);
    setResendResult(null);

    try {
      const response = await api.post('/auth/resend-verification', { email });
      setResendResult(response.data);
      setMessage(response.data.message || 'Verification email sent! Please check your inbox.');
      
      // If OTP is provided in development mode, show it
      if (response.data.developmentMode && response.data.verificationOTP) {
        setMessage(`Verification code: ${response.data.verificationOTP} (Check server console for email preview URL)`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error sending verification email');
    } finally {
      setResending(false);
    }
  };


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

      {/* Right Section - Verify Email Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="mt-2 text-gray-600">
              {token 
                ? 'Click the button below to verify your email address.'
                : 'Enter the 6-digit code sent to your email address.'}
            </p>
            {!token && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> In development mode, emails are not actually sent. 
                  Check the server console or use the "Resend Verification Code" button to see the OTP.
                </p>
              </div>
            )}
          </div>

          {verified ? (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md flex items-center space-x-2">
              <FiCheckCircle className="h-5 w-5" />
              <span>{message}</span>
            </div>
          ) : (
            <>
              {message && (
                <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-md">
                  {message}
                  {resendResult?.emailPreviewUrl && (
                    <div className="mt-2">
                      <a 
                        href={resendResult.emailPreviewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Email Preview →
                      </a>
                    </div>
                  )}
                </div>
              )}
              {resendResult?.developmentMode && resendResult?.verificationOTP && (
                <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded-md">
                  <p className="font-semibold mb-2">Development Mode - Verification Code:</p>
                  <p className="text-3xl font-bold text-center mb-2">{resendResult.verificationOTP}</p>
                  <p className="text-sm">Use this code to verify your email</p>
                  {resendResult.emailPreviewUrl && (
                    <p className="text-sm mt-2">
                      <a 
                        href={resendResult.emailPreviewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Email Preview →
                      </a>
                    </p>
                  )}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center space-x-2">
                  <FiXCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              {!token && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition"
                      style={{ borderColor: '#b4b4b4' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#fab242';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#b4b4b4';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <div className="flex justify-between gap-2">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-full h-14 text-center text-2xl font-bold border-2 rounded-md focus:outline-none focus:ring-2 transition"
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
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Enter the 6-digit code from your email
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleVerify}
                  disabled={loading || verified || (!token && (!email || otp.join('').length !== 6))}
                  className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  style={{ backgroundColor: '#fab242' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#d19c49')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fab242')}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <FiMail className="h-5 w-5" />
                      <span>Verify Email</span>
                    </>
                  )}
                </button>

                {!token && (
                  <button
                    onClick={handleResend}
                    disabled={resending || !email}
                    className="w-full flex justify-center items-center space-x-2 py-2 px-4 border rounded-md text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    style={{ 
                      borderColor: '#b4b4b4',
                      color: '#000000'
                    }}
                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#f1f3f9')}
                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    {resending ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="h-4 w-4" />
                        <span>Resend Verification Code</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already verified?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-medium transition"
                style={{ color: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

