import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout for all requests
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 unauthorized errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle 403 forbidden errors (role-based authorization)
    // Don't redirect automatically - let the component handle it
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response?.data?.message);
      // The error will be passed to the component to handle
    }
    
    // Handle connection errors (backend not running)
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.error('Backend server is not running. Please start the backend server on port 5001.');
      // Don't show error to user for connection refused - it's a dev environment issue
      return Promise.reject({
        ...error,
        message: 'Unable to connect to server. Please ensure the backend server is running.',
        isConnectionError: true
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;

