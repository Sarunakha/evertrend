import express from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import LoyaltyPoints from '../models/LoyaltyPoints.js';
import PointTransaction from '../models/PointTransaction.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import { protect, authorize, checkOwnership, adminMiddleware } from '../middleware/auth.js';
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

// @route   GET /api/orders/admin/all
// @desc    Get all orders (Admin only)
// @access  Private (Admin)
// NOTE: This route must come BEFORE /:id to avoid route matching conflicts
router.get('/admin/all', adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const orders = await Order.find({})
      .populate('userId', 'username email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ orderDate: -1 });

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id })
          .populate('productId', 'name images price sellerId');
        return {
          ...order.toObject(),
          items
        };
      })
    );

    const total = await Order.countDocuments({});

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
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching orders'
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

    // Clear cart after successful order creation
    // Since the order contains all items from the cart, we clear the entire cart
    try {
      const cart = await Cart.findOne({ userId: req.user._id });
      if (cart && cart.items && cart.items.length > 0) {
        // Clear all items from cart after successful order
        cart.items = [];
        await cart.save();
        console.log(`Cart cleared for user ${req.user._id} after order ${order._id}`);
      }
    } catch (cartError) {
      console.error('Error clearing cart after order creation:', cartError);
      // Don't fail the order if cart clearing fails
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

    // Get the order with old status before updating
    const oldOrder = await Order.findById(req.params.id);
    
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const oldStatus = oldOrder.status;
    const newStatus = req.body.status;

    // Update order status
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true, runValidators: true }
    ).populate('userId', '_id');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Notification Logic: Notify buyer when seller updates order status
    const orderIdShort = order._id.toString().slice(-8);
    
    // Scenario 1: Seller Ships Order (Pending → Shipped)
    if (oldStatus === 'Pending' && newStatus === 'Shipped') {
      try {
        await Notification.create({
          recipientId: order.userId._id,
          senderId: req.user._id,
          type: 'ORDER_UPDATE',
          message: `Your order #${orderIdShort} has been shipped and is on its way!`,
          relatedId: order._id,
          isRead: false
        });
      } catch (notificationError) {
        console.error('Error creating shipment notification:', notificationError);
        // Don't fail the order update if notification creation fails
      }
    }

    // Scenario 2: Seller Marks Order as Delivered (Shipped → Delivered)
    if (oldStatus === 'Shipped' && newStatus === 'Delivered') {
      try {
        await Notification.create({
          recipientId: order.userId._id,
          senderId: req.user._id,
          type: 'ORDER_UPDATE',
          message: `Your order #${orderIdShort} has been delivered. Enjoy your purchase!`,
          relatedId: order._id,
          isRead: false
        });
      } catch (notificationError) {
        console.error('Error creating delivery notification:', notificationError);
        // Don't fail the order update if notification creation fails
      }
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

// @route   PUT /api/orders/:id/confirm-delivery
// @desc    Buyer confirms delivery (marks order as delivered)
// @access  Private (Buyer only)
router.put('/:id/confirm-delivery', async (req, res) => {
  try {
    // Only buyers can confirm delivery
    if (req.user.role !== 'Buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can confirm delivery'
      });
    }

    const order = await Order.findById(req.params.id).populate('userId', '_id');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to the buyer
    if (order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm delivery for this order'
      });
    }

    // Check if order is in Shipped status
    if (order.status !== 'Shipped') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm delivery. Order status must be 'Shipped'. Current status: ${order.status}`
      });
    }

    // Update order status to Delivered
    order.status = 'Delivered';
    await order.save();

    // Scenario B: Buyer Confirms Delivery
    // Notify seller(s) associated with items in the order
    try {
      // Get all order items with their products to find sellers
      const orderItems = await OrderItem.find({ orderId: order._id })
        .populate('productId', 'sellerId name');

      // Group items by seller to avoid duplicate notifications
      const sellerMap = new Map();

      orderItems.forEach(item => {
        if (item.productId && item.productId.sellerId) {
          const sellerId = item.productId.sellerId.toString();
          if (!sellerMap.has(sellerId)) {
            sellerMap.set(sellerId, {
              sellerId: item.productId.sellerId,
              items: []
            });
          }
          sellerMap.get(sellerId).items.push(item.productId.name);
        }
      });

      // Create notifications for each seller
      const orderIdShort = order._id.toString().slice(-8);
      const notificationPromises = Array.from(sellerMap.values()).map(sellerData => {
        return Notification.create({
          recipientId: sellerData.sellerId,
          senderId: req.user._id,
          type: 'ORDER_UPDATE',
          message: `Order #${orderIdShort} has been marked as Delivered by the buyer.`,
          relatedId: order._id,
          isRead: false
        });
      });

      await Promise.allSettled(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating delivery confirmation notifications:', notificationError);
      // Don't fail the order update if notification creation fails
    }

    res.json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: order
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error confirming delivery'
    });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Buyer requests order cancellation
// @access  Private (Buyer only)
router.post('/:id/cancel', [
  body('reason').notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Only buyers can request cancellation
    if (req.user.role !== 'Buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can request order cancellation'
      });
    }

    const { reason } = req.body;
    const order = await Order.findById(req.params.id).populate('userId', 'username email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to the buyer
    if (order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Validation: Only orders that are 'Pending' or 'Processing' can be cancelled
    if (order.status === 'Shipped' || order.status === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order. Orders that have been shipped or delivered cannot be cancelled. Please use the Return feature for delivered items.'
      });
    }

    // Check if cancellation already requested
    if (order.cancellationRequest?.isRequested) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation request already exists for this order'
      });
    }

    // Update order with cancellation request
    order.cancellationRequest = {
      isRequested: true,
      reason: reason,
      requestDate: new Date(),
      adminResponse: null
    };
    order.status = 'Cancellation Requested';
    await order.save();

    // Send notification to all admins
    try {
      const admins = await User.find({ role: 'Admin' }).select('_id');
      const orderIdShort = order._id.toString().slice(-8);
      const buyerName = order.userId.username || order.userId.email;

      const notificationPromises = admins.map(admin =>
        Notification.create({
          recipientId: admin._id,
          senderId: req.user._id,
          type: 'ORDER_CANCELLATION_REQUEST',
          message: `Buyer ${buyerName} has requested to cancel Order #${orderIdShort}`,
          relatedId: order._id,
          isRead: false
        })
      );

      await Promise.allSettled(notificationPromises);
    } catch (notificationError) {
      console.error('Error creating notifications for cancellation request:', notificationError);
      // Don't fail the cancellation request if notification creation fails
    }

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully. Admin will review your request.',
      data: order
    });
  } catch (error) {
    console.error('Request cancellation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error requesting cancellation'
    });
  }
});

// @route   PUT /api/orders/:id/handle-cancellation
// @desc    Admin approves or rejects cancellation request
// @access  Private (Admin only)
router.put('/:id/handle-cancellation', adminMiddleware, [
  body('action').isIn(['Approve', 'Reject']).withMessage('Action must be either Approve or Reject'),
  body('adminResponse').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { action, adminResponse } = req.body;
    const order = await Order.findById(req.params.id).populate('userId', '_id username email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if cancellation was requested
    if (!order.cancellationRequest?.isRequested) {
      return res.status(400).json({
        success: false,
        message: 'No cancellation request exists for this order'
      });
    }

    // Check if order is in Cancellation Requested status
    if (order.status !== 'Cancellation Requested') {
      return res.status(400).json({
        success: false,
        message: `Order is not in 'Cancellation Requested' status. Current status: ${order.status}`
      });
    }

    const orderIdShort = order._id.toString().slice(-8);
    let notificationMessage = '';

    if (action === 'Approve') {
      // Update order status to Cancelled
      order.status = 'Cancelled';
      order.cancellationRequest.adminResponse = adminResponse || 'Cancellation approved by admin';
      await order.save();

      // Restore stock quantity for products
      try {
        const orderItems = await OrderItem.find({ orderId: order._id });
        for (const item of orderItems) {
          const product = await Product.findById(item.productId);
          if (product) {
            product.stockQuantity += item.quantity;
            if (product.isSold && product.stockQuantity > 0) {
              product.isSold = false;
            }
            await product.save();
          }
        }
      } catch (stockError) {
        console.error('Error restoring stock:', stockError);
        // Don't fail the cancellation if stock restoration fails
      }

      notificationMessage = `Your cancellation request for Order #${orderIdShort} has been approved.`;
    } else if (action === 'Reject') {
      // Revert order status to previous status (Pending or Processing)
      // We'll default to 'Pending' if we can't determine previous status
      const previousStatus = order.status === 'Cancellation Requested' ? 'Pending' : 'Pending';
      order.status = previousStatus;
      order.cancellationRequest.isRequested = false;
      order.cancellationRequest.adminResponse = adminResponse || 'Cancellation request rejected by admin';
      await order.save();

      const rejectionReason = adminResponse ? ` Reason: ${adminResponse}` : '';
      notificationMessage = `Your cancellation request for Order #${orderIdShort} was rejected.${rejectionReason}`;
    }

    // Send notification to buyer
    try {
      await Notification.create({
        recipientId: order.userId._id,
        senderId: req.user._id,
        type: 'ORDER_CANCELLATION_UPDATE',
        message: notificationMessage,
        relatedId: order._id,
        isRead: false
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the cancellation handling if notification creation fails
    }

    res.json({
      success: true,
      message: `Cancellation request ${action.toLowerCase()}d successfully`,
      data: order
    });
  } catch (error) {
    console.error('Handle cancellation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error handling cancellation request'
    });
  }
});

export default router;

