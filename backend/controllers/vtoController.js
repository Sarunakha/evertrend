import Product from '../models/Product.js';
import User from '../models/User.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Rule:
 * - Exact match => 100%
 * - Every 2 inch difference => -10%  (=> -5% per inch)
 */
const scoreFromDiff = (diff) => clamp(Math.round(100 - (Math.abs(diff) * 5)), 0, 100);

const pickBestSize = (bodyMeasurements, sizeChart) => {
  const sizes = ['S', 'M', 'L', 'XL'];
  const keys = ['chest', 'waist', 'hips', 'shoulderWidth'];

  let best = null;

  for (const size of sizes) {
    const chart = sizeChart?.[size];
    if (!chart) continue;

    let totalAbsDiff = 0;
    let used = 0;
    for (const k of keys) {
      const userVal = bodyMeasurements?.[k];
      const prodVal = chart?.[k];
      if (typeof userVal !== 'number' || typeof prodVal !== 'number') continue;
      totalAbsDiff += Math.abs(userVal - prodVal);
      used += 1;
    }

    if (used === 0) continue;

    const avgAbsDiff = totalAbsDiff / used;
    if (!best || avgAbsDiff < best.avgAbsDiff) {
      best = { size, avgAbsDiff, chart };
    }
  }

  return best;
};

export const calculateFit = async (req, res) => {
  try {
    const { productId, userId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const targetUserId = userId || req.user?._id;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const [product, user] = await Promise.all([
      Product.findById(productId).lean(),
      User.findById(targetUserId).lean()
    ]);

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!product.sizeChart) {
      return res.status(400).json({ success: false, message: 'Product size chart not available' });
    }
    if (!user.bodyMeasurements) {
      return res.status(400).json({
        success: false,
        message: 'User body measurements not found. Please update your profile.'
      });
    }

    const best = pickBestSize(user.bodyMeasurements, product.sizeChart);
    if (!best) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient size chart data to calculate fit.'
      });
    }

    const keys = ['chest', 'waist', 'hips', 'shoulderWidth'];
    const breakdown = {};
    const summaryLines = [];
    const scores = [];

    for (const k of keys) {
      const userVal = user.bodyMeasurements?.[k];
      const prodVal = best.chart?.[k];
      if (typeof userVal !== 'number' || typeof prodVal !== 'number') continue;
      const diff = userVal - prodVal;
      const score = scoreFromDiff(diff);
      breakdown[k] = { user: userVal, product: prodVal, diff, score };
      scores.push(score);

      const prettyKey =
        k === 'shoulderWidth' ? 'shoulder width' : k;
      summaryLines.push(`This ${best.size} size will be a ${score}% fit for your ${prettyKey}.`);
    }

    const fitPercentage = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return res.json({
      success: true,
      data: {
        productId: product._id,
        recommendedSize: best.size,
        fitPercentage,
        breakdown,
        summary: summaryLines
      }
    });
  } catch (error) {
    console.error('VTO calculateFit error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error calculating fit'
    });
  }
};

