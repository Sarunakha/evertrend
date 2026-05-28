/**
 * Central environment helpers for API, Socket.io, and asset URLs.
 * Vite exposes variables prefixed with VITE_ via import.meta.env.
 */

const trimTrailingSlash = (url) => (url || '').replace(/\/$/, '');

/** Backend origin without /api suffix — used for eSewa redirect and axios when set */
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

const isLocalHost = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.endsWith('.local');

/** Resolve product/VTO image paths for production (HTTPS, API origin, no localhost) */
export const resolveAssetUrl = (src) => {
  if (!src || typeof src !== 'string') return '';

  let url = src.trim();
  if (!url) return '';

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const origin = getApiOrigin();

  if (url.startsWith('/') && !url.startsWith('//') && origin) {
    return `${origin}${url}`;
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);

      if (isLocalHost(parsed.hostname) && origin) {
        return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        parsed.protocol === 'http:' &&
        !isLocalHost(parsed.hostname)
      ) {
        parsed.protocol = 'https:';
        return parsed.toString();
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
};
