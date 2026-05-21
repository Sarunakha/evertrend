import axios from 'axios';
import { getApiBaseUrl } from './env.js';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response?.data?.message);
    }

    const contentType = error.response?.headers?.['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.error(
        'API returned HTML instead of JSON. Set VITE_API_URL to your backend URL and disable Vercel Deployment Protection on the backend (or use a public production backend URL).'
      );
    }

    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.error('Unable to reach API server. Check VITE_API_URL or start the backend locally.');
      return Promise.reject({
        ...error,
        message: 'Unable to connect to server. Please try again later.',
        isConnectionError: true
      });
    }

    return Promise.reject(error);
  }
);

export default api;
