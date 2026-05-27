/**
 * Central environment helpers for API, Socket.io, and asset URLs.
 * Vite exposes variables prefixed with VITE_ via import.meta.env.
 */

const trimTrailingSlash = (url) => (url || '').replace(/\/$/, '');

/** Backend origin without /api suffix — used for eSewa server redirect */
export const getApiOrigin = () => {
  const apiUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || '');
  if (apiUrl) return apiUrl;
  return trimTrailingSlash(import.meta.env.VITE_BACKEND_URL || '');
};

/** Axios base URL — production uses full API URL; dev defaults to Vite proxy */
export const getApiBaseUrl = () => {
  const origin = getApiOrigin();
  return origin ? `${origin}/api` : '/api';
};

/** Socket.io server URL (same origin as API, no /api path) */
export const getSocketUrl = () => {
  const origin = getApiOrigin();
  if (origin) return origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

/** Resolve product/VTO image paths for production (supports absolute URLs and relative paths) */
export const resolveAssetUrl = (src) => {
  if (!src || typeof src !== 'string') return '';
  if (/^https?:\/\//i.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  const origin = getApiOrigin();
  if (origin && src.startsWith('/')) {
    return `${origin}${src}`;
  }
  return src;
};