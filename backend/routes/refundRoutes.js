import express from 'express';
import { body, validationResult } from 'express-validator';
import RefundRequest from '../models/RefundRequest.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/refunds
// @desc    Create a refund request (Buyer only)
// @access  Private (Buyer)
router.post('/', [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  body('images').optional().isArray().withMessage('Images must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Only buyers can create refund requests
    if (req.user.role !== 'Buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can create refund requests'
      });
    }

    const { orderId, productId, reason, images = [] } = req.body;

    // Verify order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create refund for this order'
      });
    }

    // Verify order is delivered
    if (order.status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be returned'
      });
    }

    // Verify product exists in order
    const orderItem = await OrderItem.findOne({
      orderId: order._id,
      productId: productId
    });

    if (!orderItem) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in this order'
      });
    }

    // One return per order item; allow a new request only if the previous was rejected
    const existingRequest = await RefundRequest.findOne({
      orderId: order._id,
      productId,
      userId: req.user._id,
      status: { $ne: 'Rejected' }
    });

    if (existingRequest) {
      const statusLabel =
        existingRequest.status === 'Refunded'
          ? 'already refunded'
          : `already ${existingRequest.status.toLowerCase()}`;
      return res.status(400).json({
        success: false,
        message: `A return request for this item is ${statusLabel}. You cannot submit another request.`
      });
    }

    // Get product to find seller
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Calculate refund amount (unit price * quantity)
    const amount = orderItem.unitPrice * orderItem.quantity;

    // Create refund request
    const refundRequest = await RefundRequest.create({
      orderId: order._id,
      productId: productId,
      userId: req.user._id,
      sellerId: product.sellerId,
      reason,
      images,
      amount,
      status: 'Pending'
    });

    // Create notification for seller
    await Notification.create({
      recipientId: product.sellerId,
      senderId: req.user._id,
      type: 'REFUND_REQUEST',
      message: `New refund request for product in order #${order._id.toString().slice(-8)}`,
      relatedId: refundRequest._id,
      isRead: false
    });

    // Populate the refund request
    const populatedRequest = await RefundRequest.findById(refundRequest._id)
      .populate('orderId', 'status orderDate')
      .populate('productId', 'name images')
      .populate('userId', 'username email')
      .populate('sellerId', 'username');

    res.status(201).json({
      success: true,
      message: 'Refund request created successfully',
      data: populatedRequest
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A return request for this item already exists.'
      });
    }
    console.error('Create refund request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating refund request'
    });
  }
});

// @route   GET /api/refunds/seller
// @desc    Get refund requests for seller
// @access  Private (Seller, Admin)
router.get('/seller', authorize('Seller', 'Admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { sellerId: req.user._id };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const refundRequests = await RefundRequest.find(query)
      .populate('orderId', 'status orderDate totalAmount')
      .populate('productId', 'name images price')
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RefundRequest.countDocuments(query);

    res.json({
      success: true,
      data: refundRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get seller refund requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching refund requests'
    });
  }
});

// @route   GET /api/refunds
// @desc    Get refund requests for buyer
// @access  Private (Buyer)
router.get('/', async (req, res) => {
  try {
    // Only buyers can see their own refund requests
    if (req.user.role !== 'Buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can view their refund requests'
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user._id };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    const refundRequests = await RefundRequest.find(query)
      .populate('orderId', 'status orderDate totalAmount')
      .populate('productId', 'name images price')
      .populate('sellerId', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RefundRequest.countDocuments(query);

    res.json({
      success: true,
      data: refundRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get buyer refund requests error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching refund requests'
    });
  }
});

// @route   PUT /api/refunds/:id/status
// @desc    Update refund request status (Seller/Admin only)
// @access  Private (Seller, Admin)
router.put('/:id/status', authorize('Seller', 'Admin'), [
  body('status').isIn(['Pending', 'Approved', 'Rejected', 'Refunded']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status } = req.body;
    const refundRequest = await RefundRequest.findById(req.params.id)
      .populate('orderId')
      .populate('productId')
      .populate('userId');

    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: 'Refund request not found'
      });
    }

    // Check if seller owns the product (unless Admin)
    if (req.user.role !== 'Admin' && refundRequest.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this refund request'
      });
    }

    // Validate status transition
    if (refundRequest.status === 'Refunded') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a refunded request'
      });
    }

    // Update status
    refundRequest.status = status;
    await refundRequest.save();

    // Create notification for buyer
    let notificationMessage = '';
    if (status === 'Approved') {
      notificationMessage = `Your refund request for order #${refundRequest.orderId._id.toString().slice(-8)} has been approved`;
    } else if (status === 'Rejected') {
      notificationMessage = `Your refund request for order #${refundRequest.orderId._id.toString().slice(-8)} has been rejected`;
    } else if (status === 'Refunded') {
      notificationMessage = `Your refund for order #${refundRequest.orderId._id.toString().slice(-8)} has been processed`;
    }

    if (notificationMessage) {
      await Notification.create({
        recipientId: refundRequest.userId._id,
        senderId: req.user._id,
        type: 'REFUND_UPDATE',
        message: notificationMessage,
        relatedId: refundRequest._id,
        isRead: false
      });
    }

    // Populate the updated request
    const populatedRequest = await RefundRequest.findById(refundRequest._id)
      .populate('orderId', 'status orderDate totalAmount')
      .populate('productId', 'name images price')
      .populate('userId', 'username email')
      .populate('sellerId', 'username');

    res.json({
      success: true,
      message: 'Refund request status updated successfully',
      data: populatedRequest
    });
  } catch (error) {
    console.error('Update refund status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating refund request status'
    });
  }
});

export default router;
