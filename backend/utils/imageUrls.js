/**
 * Normalize product image URLs for production (HTTPS, public host, no localhost).
 */

const getPublicApiBase = () => {
  const raw =
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    process.env.FRONTEND_URL ||
    '';

  return raw.replace(/\/$/, '');
};

export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  let normalized = url.trim();
  if (!normalized) return normalized;

  // Protocol-relative → https
  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }

  // Relative path → prepend public API base
  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    const base = getPublicApiBase();
    return base ? `${base}${normalized}` : normalized;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname.endsWith('.local');

    if (isLocal) {
      const base = getPublicApiBase();
      if (base) {
        return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    }

    // Upgrade http → https in production (fixes mixed-content blocking on Vercel)
    if (
      process.env.NODE_ENV === 'production' &&
      parsed.protocol === 'http:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    ) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return normalized;
  }
};

export const normalizeProductImages = (product) => {
  if (!product) return product;

  const doc = product.toObject ? product.toObject() : { ...product };

  if (Array.isArray(doc.images)) {
    doc.images = doc.images.map((img) => normalizeImageUrl(img)).filter(Boolean);
  }

  if (doc.vtoImage) {
    doc.vtoImage = normalizeImageUrl(doc.vtoImage);
  }

  return doc;
};

export const normalizeProductsList = (products) =>
  (products || []).map((p) => normalizeProductImages(p));
