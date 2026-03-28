import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import LoyaltyPoints from '../models/LoyaltyPoints.js';
import PointTransaction from '../models/PointTransaction.js';
import Coupon from '../models/Coupon.js';
import { protect, authorize, checkOwnership } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/measurements
// @desc    Get current user's measurements (for simplified VTO)
// @access  Private
router.get('/measurements', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('measurements bodyMeasurements');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const measurements =
      user.measurements ||
      (user.bodyMeasurements
        ? {
            height: user.bodyMeasurements.height ?? null,
            chest: user.bodyMeasurements.chest ?? null,
            waist: user.bodyMeasurements.waist ?? null
          }
        : null);

    return res.json({ success: true, data: measurements });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/redeem-points
// @desc    Redeem Trend Points into a single-use coupon for the user
// @access  Private
router.post(
  '/redeem-points',
  protect,
  [
    body('points').optional().isInt({ min: 1 }).withMessage('Points must be a positive integer'),
    body('discountAmount').optional().isFloat({ min: 0.01 }).withMessage('Discount amount must be greater than 0')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // Default offer: 500 points => Rs.100 off (as requested)
      const points = req.body.points ? parseInt(req.body.points, 10) : 500;
      const discountAmount = req.body.discountAmount ? parseFloat(req.body.discountAmount) : 50;

      let loyaltyPoints = await LoyaltyPoints.findOne({ userId: req.user._id });
      if (!loyaltyPoints) {
        loyaltyPoints = await LoyaltyPoints.create({
          userId: req.user._id,
          totalPoints: 0,
          lifetimePoints: 0
        });
      }

      if (loyaltyPoints.totalPoints < points) {
        return res.status(400).json({
          success: false,
          message: `Insufficient points. You have ${loyaltyPoints.totalPoints} points, but need ${points} points.`
        });
      }

      if (points < 500) {
        return res.status(400).json({
          success: false,
          message: 'Minimum redemption is 500 points.'
        });
      }

      const newBalance = await loyaltyPoints.redeemPoints(points);

      const couponCode = `TREND${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const coupon = await Coupon.create({
        code: couponCode,
        type: 'fixed',
        value: discountAmount,
        description: `Redeemed ${points} TrendPoints for Rs.${discountAmount} discount`,
        minPurchaseAmount: 0,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        usageLimit: 1,
        isActive: true,
        createdBy: req.user._id,
        redeemedBy: req.user._id,
        pointsCost: points
      });

      await PointTransaction.create({
        userId: req.user._id,
        points: -points,
        type: 'redeemed',
        reason: `Redeemed ${points} points for coupon ${couponCode}`,
        referenceId: coupon._id,
        referenceType: 'coupon',
        balanceAfter: newBalance
      });

      return res.status(201).json({
        success: true,
        message: `Redeemed ${points} points for a Rs.${discountAmount} discount coupon.`,
        data: {
          coupon: { code: coupon.code, discountAmount: coupon.value, validUntil: coupon.validUntil },
          remainingPoints: newBalance
        }
      });
    } catch (error) {
      console.error('Redeem points (users) error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error redeeming points' });
    }
  }
);

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', protect, [
  body('username').optional().trim().isLength({ min: 3, max: 30 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['Admin', 'Seller', 'Buyer']),
  body('sizeProfile.shoulder').optional().isNumeric(),
  body('sizeProfile.chest').optional().isNumeric(),
  body('sizeProfile.length').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Users can only update themselves unless they're Admin
    if (req.params.id !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    const { username, email, role, sizeProfile } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (sizeProfile) updateData.sizeProfile = sizeProfile;
    // Allow role upgrade from Buyer to Seller (but not downgrade)
    let roleUpgraded = false;
    if (role && req.user.role === 'Buyer' && role === 'Seller') {
      updateData.role = 'Seller';
      roleUpgraded = true;
    } else if (role && req.user.role === 'Admin') {
      updateData.role = role; // Admin can change any role
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If role was upgraded, return new token
    const responseData = {
      success: true,
      data: user
    };

    if (roleUpgraded) {
      const { generateToken } = await import('../utils/generateToken.js');
      responseData.token = generateToken(user._id);
      responseData.message = 'Role upgraded to Seller successfully';
    }

    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    // Check if already following
    if (currentUser.following.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Add to following and followers
    currentUser.following.push(req.params.id);
    userToFollow.followers.push(req.user._id);

    await currentUser.save();
    await userToFollow.save();

    res.json({
      success: true,
      message: `Following ${userToFollow.username}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/users/:id/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:id/unfollow', protect, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from following and followers
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== req.params.id
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({
      success: true,
      message: `Unfollowed ${userToUnfollow.username}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

