import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import { protect, adminMiddleware } from '../middleware/auth.js';
import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminMiddleware);

// @route   GET /api/admin/overview
// @desc    Get dashboard overview statistics
// @access  Private/Admin
router.get('/overview', async (req, res) => {
  try {
    const [
      totalRevenue,
      totalUsers,
      totalProducts,
      totalOrders,
      pendingReports,
      recentOrders,
      recentUsers
    ] = await Promise.all([
      // Total Revenue (sum of all delivered orders)
      Order.aggregate([
        { $match: { status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      // Total Users
      User.countDocuments(),
      // Total Products
      Product.countDocuments({ isSold: false }),
      // Total Orders
      Order.countDocuments(),
      // Pending Reports
      Report.countDocuments({ status: 'Pending' }),
      // Recent Orders (last 10)
      Order.find()
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('totalAmount status createdAt userId'),
      // Recent Users (last 5)
      User.find()
        .select('username email role createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    // Calculate server health (simulated)
    const serverHealth = {
      status: 'Healthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: {
        stats: {
          revenue: revenue,
          users: totalUsers,
          activeProducts: totalProducts,
          totalOrders: totalOrders,
          pendingReports: pendingReports
        },
        serverHealth,
        recentActivity: {
          orders: recentOrders,
          users: recentUsers
        }
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching overview data'
    });
  }
});

// @route   GET /api/admin/sales-report
// @desc    Get monthly sales report: daily data, summary, top products
// @access  Private/Admin
// @query   month (1-12), year (e.g. 2025) — default: current month/year
router.get('/sales-report', async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const matchMonth = {
      createdAt: { $gte: start, $lt: end },
      status: { $nin: ['Cancelled'] }
    };

    const [dailyAgg, summaryAgg, topProductsAgg] = await Promise.all([
      Order.aggregate([
        { $match: matchMonth },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: matchMonth },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $match: matchMonth },
        { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'orderId', as: 'items' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', quantitySold: { $sum: '$items.quantity' } } },
        { $sort: { quantitySold: -1 } },
        { $limit: 3 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { productId: '$_id', name: '$product.name', quantitySold: 1, _id: 0 } }
      ])
    ]);

    const totalRevenue = summaryAgg[0]?.totalRevenue ?? 0;
    const totalOrders = summaryAgg[0]?.totalOrders ?? 0;
    const dailyData = dailyAgg.map((d) => ({
      date: d._id,
      revenue: d.revenue,
      orders: d.orders
    }));
    const topProducts = topProductsAgg.map((p) => ({
      productId: p.productId,
      name: p.name || 'Unknown Product',
      quantitySold: p.quantitySold
    }));

    res.json({
      success: true,
      data: {
        month,
        year,
        summary: { totalRevenue, totalOrders },
        dailyData,
        topProducts
      }
    });
  } catch (error) {
    console.error('Admin sales-report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching sales report'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with management capabilities
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
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
    console.error('Admin users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching users'
    });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role (Promote/Demote)
// @access  Private/Admin
router.put('/users/:id/role', [
  body('role').isIn(['Admin', 'Seller', 'Buyer']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user role'
    });
  }
});

// @route   PUT /api/admin/users/:id/suspend
// @desc    Suspend or unsuspend user account
// @access  Private/Admin
router.put('/users/:id/suspend', [
  body('suspended').isBoolean().withMessage('Suspended must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { suspended } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isSuspended: suspended,
        status: suspended ? 'Suspended' : 'Active'
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: suspended ? 'User account suspended' : 'User account unsuspended',
      data: user
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error suspending user'
    });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products for moderation
// @access  Private/Admin
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', flagged = false } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (flagged) {
      query.flaggedForReview = true;
    }

    const products = await Product.find(query)
      .populate('sellerId', 'username email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching products'
    });
  }
});

// @route   PUT /api/admin/products/:id/flag
// @desc    Flag product for review
// @access  Private/Admin
router.put('/products/:id/flag', [
  body('flagged').isBoolean().withMessage('Flagged must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { flagged } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { flaggedForReview: flagged },
      { new: true, runValidators: true }
    ).populate('sellerId', 'username email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (flagged && product.sellerId) {
      const sellerId = product.sellerId._id || product.sellerId;
      await Notification.create({
        recipientId: sellerId,
        senderId: null,
        type: 'PRODUCT_FLAGGED',
        message: `Your product "${product.name}" has been flagged by the admin. Please review our community guidelines or contact support.`,
        relatedId: product._id,
        isRead: false
      });
    }

    res.json({
      success: true,
      message: flagged ? 'Product flagged for review' : 'Product unflagged',
      data: product
    });
  } catch (error) {
    console.error('Flag product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error flagging product'
    });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Hard delete product
// @access  Private/Admin
router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted permanently'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting product'
    });
  }
});

// @route   GET /api/admin/reports
// @desc    Get all reports
// @access  Private/Admin
router.get('/reports', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', type = '' } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.reportType = type;
    }

    const reports = await Report.find(query)
      .populate('reportedBy', 'username email')
      .populate('resolvedBy', 'username')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reports'
    });
  }
});

// @route   PUT /api/admin/reports/:id
// @desc    Update report status
// @access  Private/Admin
router.put('/reports/:id', [
  body('status').isIn(['Pending', 'Resolved', 'Dismissed']).withMessage('Invalid status'),
  body('adminNotes').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status, adminNotes } = req.body;
    const updateData = {
      status,
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('reportedBy', 'username email')
      .populate('resolvedBy', 'username');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: `Report marked as ${status}`,
      data: report
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating report'
    });
  }
});

// @route   DELETE /api/admin/reports/:id
// @desc    Delete report
// @access  Private/Admin
router.delete('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting report'
    });
  }
});

// @route   GET /api/admin/monitor
// @desc    Get system monitoring data
// @access  Private/Admin
router.get('/monitor', async (req, res) => {
  try {
    // Simulate real-time system metrics
    const serverLoad = Math.random() * 100; // 0-100%
    const apiLatency = Math.floor(Math.random() * 200) + 50; // 50-250ms

    // Get recent errors from logs (simulated)
    const errorLogs = [
      {
        id: 1,
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        level: 'ERROR',
        message: 'Database connection timeout',
        source: 'MongoDB'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        level: 'WARN',
        message: 'High memory usage detected',
        source: 'Server'
      }
    ].sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: {
        serverLoad: parseFloat(serverLoad.toFixed(2)),
        apiLatency,
        memoryUsage: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        uptime: process.uptime(),
        errorLogs: errorLogs.slice(0, 10),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Monitor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching monitoring data'
    });
  }
});

// @route   GET /api/admin/messages
// @desc    Get all messages sent to admin (contact form + direct chat)
// @access  Private/Admin
router.get('/messages', async (req, res) => {
  try {
    const adminId = req.user._id;

    const contactMessages = await Message.find({
      type: 'contact_form',
      receiverId: adminId
    })
      .sort({ createdAt: -1 })
      .lean();

    const adminConversations = await Conversation.find({
      participants: adminId
    })
      .select('_id')
      .lean();
    const convIds = adminConversations.map((c) => c._id);

    const directMessages = await Message.find({
      type: 'chat',
      conversationId: { $in: convIds },
      senderId: { $ne: adminId }
    })
      .populate('senderId', 'username email')
      .sort({ timestamp: -1 })
      .lean();

    const contactList = contactMessages.map((m) => ({
      _id: m._id,
      source: 'contact_form',
      senderName: m.senderName,
      senderEmail: m.senderEmail,
      subject: m.subject,
      content: m.content,
      contactStatus: m.contactStatus,
      date: m.createdAt || m.timestamp,
      isRead: m.isRead
    }));

    const directList = directMessages.map((m) => ({
      _id: m._id,
      source: 'chat',
      senderName: m.senderId?.username || m.senderId?.email || 'Unknown',
      senderEmail: m.senderId?.email || '',
      subject: null,
      content: m.content,
      conversationId: m.conversationId,
      date: m.timestamp || m.createdAt,
      isRead: m.isRead
    }));

    res.json({
      success: true,
      data: {
        contactMessages: contactList,
        directMessages: directList
      }
    });
  } catch (error) {
    console.error('Admin messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching messages'
    });
  }
});

// @route   PATCH /api/admin/messages/:id
// @desc    Mark contact form message as resolved (or mark as read)
// @access  Private/Admin
router.patch('/messages/:id', [
  body('contactStatus').optional().isIn(['pending', 'resolved']).withMessage('Invalid status'),
  body('isRead').optional().isBoolean().withMessage('isRead must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const msg = await Message.findOne({
      _id: req.params.id,
      type: 'contact_form',
      receiverId: req.user._id
    });
    if (!msg) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    if (req.body.contactStatus) msg.contactStatus = req.body.contactStatus;
    if (typeof req.body.isRead === 'boolean') msg.isRead = req.body.isRead;
    await msg.save();
    return res.json({
      success: true,
      message: 'Message updated',
      data: msg
    });
  } catch (error) {
    console.error('Admin message update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating message'
    });
  }
});

// @route   POST /api/admin/messages/:id/reply
// @desc    Send reply email to contact form sender
// @access  Private/Admin
router.post('/messages/:id/reply', [
  body('replyText').trim().notEmpty().withMessage('Reply content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Reply content is required'
      });
    }
    const msg = await Message.findOne({
      _id: req.params.id,
      type: 'contact_form',
      receiverId: req.user._id
    }).lean();
    if (!msg) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    const toEmail = msg.senderEmail;
    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message: 'No sender email to reply to'
      });
    }
    const replyText = req.body.replyText.trim();
    const subject = msg.subject ? `Re: ${msg.subject}` : 'Re: Your message to EverTrend';
    await sendEmail({
      email: toEmail,
      subject,
      message: replyText,
      html: replyText.replace(/\n/g, '<br>')
    });
    return res.json({
      success: true,
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || error.message || 'Error sending reply'
    });
  }
});

export default router;

