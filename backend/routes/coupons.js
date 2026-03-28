import express from 'express';
import { body, validationResult } from 'express-validator';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/coupons
// @desc    Create a new coupon (Admin or Seller)
// @access  Private (Admin, Seller)
router.post('/', [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('type').isIn(['percentage', 'fixed']).withMessage('Type must be percentage or fixed'),
  body('value').isFloat({ min: 0.01 }).withMessage('Value must be greater than 0'),
  body('validUntil').notEmpty().withMessage('Valid until date is required'),
  body('minPurchaseAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Min purchase amount must be positive'),
  body('maxDiscountAmount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Max discount amount must be positive'),
  body('usageLimit').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Usage limit must be at least 1')
], async (req, res) => {
  try {
    // Only Admin and Seller can create coupons
    if (req.user.role !== 'Admin' && req.user.role !== 'Seller') {
      return res.status(403).json({
        success: false,
        message: 'Only Admins and Sellers can create coupons'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Format validation errors into a readable message
      const errorMessages = errors.array().map(err => {
        return err.param ? `${err.param}: ${err.msg}` : err.msg;
      }).join(', ');
      
      return res.status(400).json({
        success: false,
        message: errorMessages || 'Validation failed. Please check your input.',
        errors: errors.array()
      });
    }

    const {
      code,
      type,
      value,
      description,
      minPurchaseAmount = 0,
      maxDiscountAmount,
      validUntil,
      usageLimit
    } = req.body;

    // Validate and parse date
    let validUntilDate;
    try {
      // Accept ISO8601 format or YYYY-MM-DD format
      if (!validUntil || typeof validUntil !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid until date is required'
        });
      }

      // Try parsing the date
      validUntilDate = new Date(validUntil);
      
      if (isNaN(validUntilDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Valid until must be a valid date (format: YYYY-MM-DD)'
        });
      }

      // Check if date is in the future (allow same day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(validUntilDate);
      expiryDate.setHours(0, 0, 0, 0);
      
      if (expiryDate <= today) {
        return res.status(400).json({
          success: false,
          message: 'Valid until date must be today or in the future'
        });
      }
    } catch (dateError) {
      console.error('Date parsing error:', dateError);
      return res.status(400).json({
        success: false,
        message: 'Valid until must be a valid date (format: YYYY-MM-DD)'
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    // Validate percentage coupon
    if (type === 'percentage' && value > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%'
      });
    }

    // Validate maxDiscountAmount for percentage coupons
    if (type === 'percentage' && maxDiscountAmount && maxDiscountAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Max discount amount must be greater than 0 for percentage coupons'
      });
    }

    // Prepare coupon data
    const couponData = {
      code: code.toUpperCase().trim(),
      type,
      value: parseFloat(value),
      description: description?.trim() || '',
      minPurchaseAmount: parseFloat(minPurchaseAmount) || 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      validFrom: new Date(),
      validUntil: validUntilDate,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      isActive: true,
      createdBy: req.user._id,
      sellerId: req.user.role === 'Seller' ? req.user._id : null
    };

    // Create coupon
    const coupon = await Coupon.create(couponData);

    // Create notifications for all buyers (or targeted users)
    try {
      // Get all buyers to notify them about the new coupon
      const buyers = await User.find({ role: 'Buyer' }).select('_id');
      
      // Create notifications in batches to avoid overwhelming the system
      const notificationPromises = buyers.map(buyer =>
        Notification.create({
          recipientId: buyer._id,
          senderId: req.user._id,
          type: 'NEW_COUPON',
          message: `New coupon available: ${coupon.code}! ${coupon.description || 'Use it on your next purchase'}`,
          relatedId: coupon._id,
          isRead: false
        })
      );

      // Execute notifications in parallel (but don't fail coupon creation if this fails)
      await Promise.allSettled(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating notifications for new coupon:', notificationError);
      // Don't fail the coupon creation if notification creation fails
    }

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating coupon'
    });
  }
});

// @route   GET /api/coupons
// @desc    Get all coupons (filtered by user role)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const query = {};

    // Sellers can only see their own coupons
    if (req.user.role === 'Seller') {
      query.sellerId = req.user._id;
    } else if (req.user.role === 'Buyer') {
      // Buyers can only see active, valid coupons
      query.isActive = true;
      query.validUntil = { $gte: new Date() };
      query.$or = [
        { sellerId: null }, // Platform-wide coupons
        { redeemedBy: req.user._id } // Their redeemed coupons
      ];
    }

    // Only filter by active status if explicitly provided
    if (active !== undefined) {
      query.isActive = active === 'true' || active === true;
    }

    const coupons = await Coupon.find(query)
      .populate('createdBy', 'username')
      .populate('sellerId', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Coupon.countDocuments(query);

    res.json({
      success: true,
      data: coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching coupons'
    });
  }
});

// @route   GET /api/coupons/:code
// @desc    Get coupon details and validate
// @access  Private
router.get('/:code', async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() })
      .populate('createdBy', 'username')
      .populate('sellerId', 'username');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if coupon is valid
    const isValid = coupon.isValid();

    res.json({
      success: true,
      data: {
        ...coupon.toObject(),
        isValid
      }
    });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching coupon'
    });
  }
});

// @route   POST /api/coupons/validate
// @desc    Validate and calculate discount for a coupon
// @access  Private
router.post('/validate', [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
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

    const { code, orderAmount } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is expired or inactive'
      });
    }

    // Check if user has already used this coupon (for one-time use coupons)
    if (coupon.usageLimit === 1 && coupon.redeemedBy && coupon.redeemedBy.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has already been used'
      });
    }

    // Check minimum purchase amount
    if (orderAmount < coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount is Rs.${coupon.minPurchaseAmount}`
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(orderAmount);

    res.json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discount,
        finalAmount: orderAmount - discount
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error validating coupon'
    });
  }
});

// @route   PUT /api/coupons/:id
// @desc    Update coupon (Admin or Seller who created it)
// @access  Private (Admin, Seller)
router.put('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'Admin' && coupon.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this coupon'
      });
    }

    const {
      description,
      minPurchaseAmount,
      maxDiscountAmount,
      validUntil,
      usageLimit,
      isActive
    } = req.body;

    // Update allowed fields
    if (description !== undefined) coupon.description = description;
    if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = minPurchaseAmount;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating coupon'
    });
  }
});

// @route   DELETE /api/coupons/:id
// @desc    Delete coupon (Admin or Seller who created it)
// @access  Private (Admin, Seller)
router.delete('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'Admin' && coupon.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this coupon'
      });
    }

    await Coupon.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting coupon'
    });
  }
});

export default router;

