import express from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import LoyaltyPoints from '../models/LoyaltyPoints.js';
import PointTransaction from '../models/PointTransaction.js';
import { protect, authorize, checkOwnership } from '../middleware/auth.js';
import { processPayment } from '../services/paymentService.js';

// Points earning rate: 1 point per Rs.25
const POINTS_PER_RUPEE = 1 / 25;

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/orders
// @desc    Get user's orders (or all orders for Admin)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = {};

    // Users can only see their own orders unless Admin
    if (req.user.role !== 'Admin') {
      query.userId = req.user._id;
    }

    const orders = await Order.find(query)
      .populate('userId', 'username email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ orderDate: -1 });

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id })
          .populate('productId', 'name images price');
        return {
          ...order.toObject(),
          items
        };
      })
    );

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: ordersWithItems,
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

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'username email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    const items = await OrderItem.find({ orderId: order._id })
      .populate('productId');

    res.json({
      success: true,
      data: {
        ...order.toObject(),
        items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('paymentMethod').isIn(['eSewa', 'Cash on Delivery', 'Bank Transfer']),
  body('shippingAddress').optional().isObject(),
  body('couponCode').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { items, paymentMethod, shippingAddress, couponCode } = req.body;

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      if (product.isSold) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is already sold`
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        unitPrice: product.price
      });
    }

    // Apply coupon if provided
    let couponDiscount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }

      if (!coupon.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Coupon is expired or inactive'
        });
      }

      // Check minimum purchase amount
      if (totalAmount < coupon.minPurchaseAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum purchase amount is Rs.${coupon.minPurchaseAmount}`
        });
      }

      // Calculate discount
      couponDiscount = coupon.calculateDiscount(totalAmount);
      
      // Use coupon
      await coupon.useCoupon();
    }

    // Calculate final amount after discount
    const finalAmount = totalAmount - couponDiscount;

    // Calculate points to be earned (based on final amount after discount)
    const pointsEarned = Math.floor(finalAmount * POINTS_PER_RUPEE);

    // Create order
    const order = await Order.create({
      userId: req.user._id,
      totalAmount: finalAmount, // Store final amount after discount
      paymentMethod,
      shippingAddress,
      status: 'Pending',
      couponCode: couponCode ? couponCode.toUpperCase() : null,
      couponDiscount,
      pointsEarned
    });

    // Create order items and update products
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order._id,
        ...item
      });

      const product = await Product.findById(item.productId);
      product.stockQuantity -= item.quantity;
      if (product.stockQuantity === 0) {
        product.isSold = true;
      }
      await product.save();
    }

    // Process payment if eSewa
    let transactionId = null;
    if (paymentMethod === 'eSewa') {
      transactionId = await processPayment(order._id.toString(), finalAmount);
      order.transactionId = transactionId;
      await order.save();
    }

    // Award points after successful order creation (only if order amount > 0)
    if (pointsEarned > 0) {
      try {
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
        const newBalance = await loyaltyPoints.addPoints(pointsEarned, `Order #${order._id}`);

        // Create transaction record
        await PointTransaction.create({
          userId: req.user._id,
          points: pointsEarned,
          type: 'earned',
          reason: `Earned from order #${order._id}`,
          referenceId: order._id,
          referenceType: 'order',
          balanceAfter: newBalance
        });
      } catch (pointsError) {
        console.error('Error awarding points:', pointsError);
        // Don't fail the order if points awarding fails
      }
    }

    // Populate order with items
    const populatedItems = await OrderItem.find({ orderId: order._id })
      .populate('productId');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        ...order.toObject(),
        items: populatedItems,
        pointsEarned: pointsEarned > 0 ? pointsEarned : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Seller/Admin only)
// @access  Private/Seller/Admin
router.put('/:id/status', authorize('Seller', 'Admin'), [
  body('status').isIn(['Pending', 'Shipped', 'Delivered', 'Cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

