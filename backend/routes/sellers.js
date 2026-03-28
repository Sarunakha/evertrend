import express from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and Seller/Admin role
router.use(protect);
router.use(authorize('Seller', 'Admin'));

// @route   GET /api/sellers/products
// @desc    Get seller's own products
// @access  Private/Seller
router.get('/products', async (req, res) => {
  try {
    const startTime = Date.now();
    const { page = 1, limit = 50, isSold } = req.query; // Reduced default limit for faster loading
    const query = { sellerId: req.user._id };

    if (isSold !== undefined) {
      query.isSold = isSold === 'true';
    }

    console.log('Fetching products for seller:', req.user._id);

    // Optimize query: use lean() for faster queries and only select needed fields
    const products = await Product.find(query)
      .select('name description price category size condition stockQuantity isSold images dimensions createdAt')
      .sort({ createdAt: -1 }) // Use index on createdAt
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean() // Returns plain JS objects (faster than Mongoose documents)
      .exec();

    const queryTime = Date.now() - startTime;
    console.log(`Products fetched in ${queryTime}ms. Found ${products.length} products.`);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/sellers/stats
// @desc    Get seller statistics
// @access  Private/Seller
router.get('/stats', async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Get product counts
    const totalProducts = await Product.countDocuments({ sellerId });
    const soldProducts = await Product.countDocuments({ sellerId, isSold: true });
    const activeProducts = await Product.countDocuments({ sellerId, isSold: false });

    // Get order statistics for this seller
    const orderItems = await OrderItem.find()
      .populate({
        path: 'productId',
        match: { sellerId }
      })
      .populate('orderId');

    const validOrderItems = orderItems.filter(item => item.productId && item.orderId);

    // Unique orders involving this seller
    const orderIds = [...new Set(validOrderItems.map(item => item.orderId._id.toString()))];
    const orders = await Order.find({ _id: { $in: orderIds } });
    const ordersById = new Map(orders.map(o => [o._id.toString(), o]));

    const totalOrders = orderIds.length;

    // Revenue should count **only delivered** orders
    const totalRevenue = validOrderItems.reduce((sum, item) => {
      const order = ordersById.get(item.orderId._id.toString());
      if (order && order.status === 'Delivered') {
        return sum + item.unitPrice * item.quantity;
      }
      return sum;
    }, 0);

    // Lost revenue from cancelled / returned / cancellation requested
    const lossStatuses = ['Cancelled', 'Returned', 'Cancellation Requested'];
    const lostRevenue = validOrderItems.reduce((sum, item) => {
      const order = ordersById.get(item.orderId._id.toString());
      if (order && lossStatuses.includes(order.status)) {
        return sum + item.unitPrice * item.quantity;
      }
      return sum;
    }, 0);

    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const shippedOrders = orders.filter(o => o.status === 'Shipped').length;
    const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          sold: soldProducts,
          active: activeProducts
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders
        },
        revenue: {
          total: totalRevenue,
          lost: lostRevenue
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/sellers/orders
// @desc    Get seller's orders
// @access  Private/Seller
router.get('/orders', async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    // Get order items for seller's products
    const orderItems = await OrderItem.find()
      .populate({
        path: 'productId',
        match: { sellerId }
      })
      .populate({
        path: 'orderId',
        populate: { path: 'userId', select: 'username email' }
      });

    const validOrderItems = orderItems.filter(item => item.productId);
    const orderIds = [...new Set(validOrderItems.map(item => item.orderId?._id.toString()))];

    const query = { _id: { $in: orderIds } };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('userId', 'username email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ orderDate: -1 });

    const total = await Order.countDocuments(query);

    // Attach order items to each order
    const ordersWithItems = orders.map(order => {
      const items = validOrderItems.filter(
        item => item.orderId?._id.toString() === order._id.toString()
      );
      return {
        ...order.toObject(),
        items
      };
    });

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

export default router;

