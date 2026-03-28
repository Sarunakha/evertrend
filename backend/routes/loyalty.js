import express from 'express';
import { body, validationResult } from 'express-validator';
import LoyaltyPoints from '../models/LoyaltyPoints.js';
import PointTransaction from '../models/PointTransaction.js';
import Coupon from '../models/Coupon.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Points earning rate: 1 point per Rs.25
const POINTS_PER_RUPEE = 1 / 25;

// @route   GET /api/loyalty/balance
// @desc    Get user's current points balance
// @access  Private
router.get('/balance', async (req, res) => {
  try {
    let loyaltyPoints = await LoyaltyPoints.findOne({ userId: req.user._id });

    // Create loyalty points record if it doesn't exist
    if (!loyaltyPoints) {
      loyaltyPoints = await LoyaltyPoints.create({
        userId: req.user._id,
        totalPoints: 0,
        lifetimePoints: 0
      });
    }

    res.json({
      success: true,
      data: {
        totalPoints: loyaltyPoints.totalPoints,
        lifetimePoints: loyaltyPoints.lifetimePoints,
        lastUpdated: loyaltyPoints.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching points balance'
    });
  }
});

// @route   GET /api/loyalty/history
// @desc    Get user's point transaction history
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const transactions = await PointTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PointTransaction.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching transaction history'
    });
  }
});

// @route   POST /api/loyalty/redeem
// @desc    Redeem points for a coupon
// @access  Private
router.post('/redeem', [
  body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
  body('discountAmount').isFloat({ min: 0.01 }).withMessage('Discount amount must be greater than 0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { points, discountAmount } = req.body;

    // Get or create loyalty points record
    let loyaltyPoints = await LoyaltyPoints.findOne({ userId: req.user._id });
    if (!loyaltyPoints) {
      loyaltyPoints = await LoyaltyPoints.create({
        userId: req.user._id,
        totalPoints: 0,
        lifetimePoints: 0
      });
    }

    // Check if user has enough points
    if (loyaltyPoints.totalPoints < points) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You have ${loyaltyPoints.totalPoints} points, but need ${points} points.`
      });
    }

    // Minimum redemption: 500 points = Rs.50
    if (points < 500) {
      return res.status(400).json({
        success: false,
        message: 'Minimum redemption is 500 points (Rs.50 discount)'
      });
    }

    // Redeem points
    const newBalance = await loyaltyPoints.redeemPoints(points);

    // Generate unique coupon code
    const couponCode = `TREND${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create coupon
    const coupon = await Coupon.create({
      code: couponCode,
      type: 'fixed',
      value: discountAmount,
      description: `Redeemed ${points} TrendPoints for Rs.${discountAmount} discount`,
      minPurchaseAmount: discountAmount, // Must use full discount
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days validity
      usageLimit: 1, // One-time use
      isActive: true,
      createdBy: req.user._id,
      redeemedBy: req.user._id,
      pointsCost: points
    });

    // Create transaction record
    await PointTransaction.create({
      userId: req.user._id,
      points: -points, // Negative for redemption
      type: 'redeemed',
      reason: `Redeemed ${points} points for coupon ${couponCode}`,
      referenceId: coupon._id,
      referenceType: 'coupon',
      balanceAfter: newBalance
    });

    res.status(201).json({
      success: true,
      message: `Successfully redeemed ${points} points for Rs.${discountAmount} discount coupon!`,
      data: {
        coupon: {
          code: coupon.code,
          discountAmount: coupon.value,
          validUntil: coupon.validUntil
        },
        remainingPoints: newBalance
      }
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error redeeming points'
    });
  }
});

// @route   POST /api/loyalty/earn
// @desc    Earn points from an order (called internally after order creation)
// @access  Private (but typically called by order service)
router.post('/earn', [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('orderAmount').isFloat({ min: 0 }).withMessage('Order amount must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { orderId, orderAmount } = req.body;

    // Calculate points: 1 point per Rs.25
    const pointsEarned = Math.floor(orderAmount * POINTS_PER_RUPEE);

    if (pointsEarned <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order amount is too small to earn points'
      });
    }

    // Get or create loyalty points record
    let loyaltyPoints = await LoyaltyPoints.findOne({ userId: req.user._id });
    if (!loyaltyPoints) {
      loyaltyPoints = await LoyaltyPoints.create({
        userId: req.user._id,
        totalPoints: 0,
        lifetimePoints: 0
      });
    }

    // Add points
    const newBalance = await loyaltyPoints.addPoints(pointsEarned, `Order #${orderId}`);

    // Create transaction record
    await PointTransaction.create({
      userId: req.user._id,
      points: pointsEarned,
      type: 'earned',
      reason: `Earned from order #${orderId}`,
      referenceId: orderId,
      referenceType: 'order',
      balanceAfter: newBalance
    });

    res.status(201).json({
      success: true,
      message: `Earned ${pointsEarned} TrendPoints!`,
      data: {
        pointsEarned,
        totalPoints: newBalance
      }
    });
  } catch (error) {
    console.error('Earn points error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error earning points'
    });
  }
});

export default router;

