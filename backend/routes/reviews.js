import express from 'express';
import { body, validationResult } from 'express-validator';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reviews/product/:productId
// @desc    Get reviews for a product
// @access  Public
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('userId', 'username email')
      .sort({ reviewDate: -1, createdAt: -1 });

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: reviews,
      summary: {
        totalReviews: reviews.length,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingDistribution: {
          5: reviews.filter(r => r.rating === 5).length,
          4: reviews.filter(r => r.rating === 4).length,
          3: reviews.filter(r => r.rating === 3).length,
          2: reviews.filter(r => r.rating === 2).length,
          1: reviews.filter(r => r.rating === 1).length
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reviews'
    });
  }
});

// @route   GET /api/reviews/can-review/:productId
// @desc    Check if user can review a product (has purchased it)
// @access  Private
router.get('/can-review/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if user has already reviewed
    const existingReview = await Review.findOne({
      userId: req.user._id,
      productId: productId
    });

    if (existingReview) {
      return res.json({
        success: true,
        canReview: false,
        reason: 'already_reviewed',
        message: 'You have already reviewed this product'
      });
    }

    // Check if user has purchased this product
    const userOrders = await Order.find({
      userId: req.user._id,
      status: { $in: ['Delivered', 'Shipped'] }
    }).select('_id');

    const orderIds = userOrders.map(order => order._id);

    const hasPurchased = await OrderItem.exists({
      orderId: { $in: orderIds },
      productId: productId
    });

    if (!hasPurchased) {
      return res.json({
        success: true,
        canReview: false,
        reason: 'not_purchased',
        message: 'You can only review products you have purchased'
      });
    }

    res.json({
      success: true,
      canReview: true,
      message: 'You can review this product'
    });
  } catch (error) {
    console.error('Check can review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking review eligibility'
    });
  }
});

// @route   POST /api/reviews
// @desc    Create review (requires verified purchase)
// @access  Private
router.post('/', protect, [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => {
        return err.param ? `${err.param}: ${err.msg}` : err.msg;
      }).join(', ');
      
      return res.status(400).json({
        success: false,
        message: errorMessages || 'Validation failed. Please check your input.',
        errors: errors.array()
      });
    }

    const { productId, rating, comment } = req.body;

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      userId: req.user._id,
      productId: productId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Verify purchase: Check if user has purchased this product
    // Find orders by user that contain this product
    const userOrders = await Order.find({ 
      userId: req.user._id,
      status: { $in: ['Delivered', 'Shipped'] } // Only count delivered or shipped orders
    }).select('_id');

    const orderIds = userOrders.map(order => order._id);

    // Check if any order items match this product
    const hasPurchased = await OrderItem.exists({
      orderId: { $in: orderIds },
      productId: productId
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased. Please complete a purchase first.'
      });
    }

    // Create review with verified purchase flag
    const review = await Review.create({
      userId: req.user._id,
      productId: productId,
      rating: parseInt(rating),
      comment: comment?.trim() || '',
      verifiedPurchase: true
    });

    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'username email');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating review'
    });
  }
});

// @route   PUT /api/reviews/:id
// @desc    Update review
// @access  Private (own reviews)
router.put('/:id', protect, [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('userId', 'username');

    res.json({
      success: true,
      data: updatedReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/reviews/:id
// @desc    Delete review
// @access  Private (own reviews)
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership or Admin
    if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

