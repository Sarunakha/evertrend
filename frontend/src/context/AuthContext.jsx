import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Check if response indicates verification is required
      if (response.data.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          email: email,
          message: response.data.message || 'Please verify your email address to continue.'
        };
      }

      // Check if login was successful
      if (!response.data.success) {
        return {
          success: false,
          message: response.data.message || 'Login failed. Please try again.'
        };
      }

      // Extract token and user data from response
      const { data } = response.data;
      const token = data?.token;
      const userData = data ? {
        _id: data._id,
        username: data.username,
        email: data.email,
        role: data.role,
        isVerified: data.isVerified
      } : null;

      if (token && userData) {
        localStorage.setItem('token', token);
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return {
          success: false,
          message: 'Invalid response from server. Please try again.'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle network errors
      if (!error.response) {
        return {
          success: false,
          message: 'Network error. Please check if the server is running and try again.'
        };
      }

      // Handle specific error responses
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || 'Login failed. Please check your credentials and try again.';
      
      // Check if it's a verification error
      if (errorData.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          email: email,
          message: errorMessage
        };
      }

      // Handle validation errors
      if (error.response.status === 400 && errorData.errors && Array.isArray(errorData.errors)) {
        const errorMessages = errorData.errors.map(err => err.msg || err.message || (err.param ? `${err.param}: ${err.msg}` : 'Validation error')).join(', ');
        return {
          success: false,
          message: errorMessages || 'Validation failed. Please check your input.'
        };
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const register = async (formData) => {
    try {
      const response = await api.post('/auth/register', formData);
      const { data, requiresVerification, verificationOTP, developmentMode } = response.data;
      
      return {
        success: true,
        requiresVerification: requiresVerification || false,
        developmentMode: developmentMode || false,
        verificationOTP: verificationOTP || null,
        message: requiresVerification 
          ? 'Registration successful! Please check your email to verify your account.'
          : 'Registration successful!'
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle network errors
      if (!error.response) {
        return {
          success: false,
          message: 'Network error. Please check if the server is running and try again.'
        };
      }
      
      // Handle 500 server errors
      if (error.response.status === 500) {
        const serverMessage = error.response.data?.message || 'Server error occurred. Please try again later.';
        return {
          success: false,
          message: serverMessage
        };
      }
      
      // Handle validation errors (400 status with errors array)
      if (error.response.status === 400 && error.response.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message || (err.param ? `${err.param}: ${err.msg}` : 'Validation error')).join(', ');
        return {
          success: false,
          message: errorMessages || 'Validation failed. Please check your input.'
        };
      }
      
      // Handle other error formats
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const loginWithGoogle = async (googleUserData) => {
    try {
      const { token, ...userData } = googleUserData;
      localStorage.setItem('token', token);
      setUser(userData);
      await fetchUser(); // Refresh user data
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Google login failed'
      };
    }
  };

  const sendOTP = async (email) => {
    try {
      const response = await api.post('/auth/request-otp', { email });
      return {
        success: true,
        message: response.data.message || 'Verification code sent to your email.',
        otp: response.data.otp // Only in development mode
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      
      if (!error.response) {
        return {
          success: false,
          message: 'Network error. Please check if the server is running and try again.'
        };
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send verification code. Please try again.';
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const registerVerified = async (formData) => {
    try {
      const response = await api.post('/auth/verify-and-signup', formData);
      const { data } = response.data;
      
      // Store token and set user
      if (data.token) {
        localStorage.setItem('token', data.token);
        setUser({
          _id: data._id,
          username: data.username,
          email: data.email,
          role: data.role,
          isVerified: data.isVerified
        });
      }
      
      return {
        success: true,
        message: response.data.message || 'Registration successful!',
        user: data
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      if (!error.response) {
        return {
          success: false,
          message: 'Network error. Please check if the server is running and try again.'
        };
      }
      
      // Handle validation errors
      if (error.response.status === 400 && error.response.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message || (err.param ? `${err.param}: ${err.msg}` : 'Validation error')).join(', ');
        return {
          success: false,
          message: errorMessages || 'Validation failed. Please check your input.'
        };
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    sendOTP,
    registerVerified,
    loginWithGoogle,
    logout,
    fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

