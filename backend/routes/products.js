import express from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { protect, authorize, checkOwnership } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with search, filter, and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      size,
      condition,
      excludeCondition,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      sellerId
    } = req.query;

    const query = { isSold: false };

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (category) query.category = category;
    if (size) query.size = size;
    if (condition) {
      query.condition = condition;
    } else if (excludeCondition) {
      // Exclude specific condition (e.g., for thrift finds, exclude 'New')
      // Only apply if condition is not already set
      query.condition = { $ne: excludeCondition };
    }
    if (sellerId) query.sellerId = sellerId;
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const products = await Product.find(query)
      .populate('sellerId', 'username email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('sellerId', 'username email followersCount')
      .populate('likes', 'username');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Seller
router.post('/', protect, authorize('Seller', 'Admin'), [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').isIn(['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Shoes']),
  body('size').isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']),
  body('condition').isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']),
  body('stockQuantity').optional().isInt({ min: 0 })
], async (req, res, next) => {
  try {
    console.log('Received product creation request');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Images count:', req.body.images?.length || 0);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg || 'Validation error',
        errors: errors.array()
      });
    }

    // Ensure price is a number
    const productData = {
      name: req.body.name?.trim(),
      description: req.body.description?.trim(),
      price: parseFloat(req.body.price),
      category: req.body.category,
      size: req.body.size,
      condition: req.body.condition,
      stockQuantity: parseInt(req.body.stockQuantity) || 1,
      images: Array.isArray(req.body.images) ? req.body.images : [],
      dimensions: req.body.dimensions || {},
      sellerId: req.user._id
    };

    // Clean up dimensions - remove empty values
    if (productData.dimensions) {
      Object.keys(productData.dimensions).forEach(key => {
        if (productData.dimensions[key] === '' || productData.dimensions[key] === null || productData.dimensions[key] === undefined) {
          delete productData.dimensions[key];
        } else {
          const parsed = parseFloat(productData.dimensions[key]);
          if (!isNaN(parsed)) {
            productData.dimensions[key] = parsed;
          } else {
            delete productData.dimensions[key];
          }
        }
      });
    }

    // Validate price
    if (isNaN(productData.price) || productData.price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    if (productData.images && productData.images.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed'
      });
    }

    console.log('Creating product with data:', {
      name: productData.name,
      price: productData.price,
      category: productData.category,
      imagesCount: productData.images?.length || 0,
      dimensions: productData.dimensions
    });

    const product = await Product.create(productData);
    console.log('Product created successfully:', product._id);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors[0] || 'Validation error',
        errors: validationErrors
      });
    }

    // Pass to next error handler if not handled
    next(error);
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Seller (own products)
router.put('/:id', protect, authorize('Seller', 'Admin'), checkOwnership(Product), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Validate image URLs if provided
    if (req.body.images && Array.isArray(req.body.images)) {
      if (req.body.images.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed'
        });
      }

      const validImageUrls = [];
      for (let i = 0; i < req.body.images.length; i++) {
        const imageUrl = req.body.images[i];
        if (typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          try {
            const url = new URL(imageUrl.trim());
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              validImageUrls.push(imageUrl.trim());
            } else {
              return res.status(400).json({
                success: false,
                message: `Image URL ${i + 1} must be a valid HTTP or HTTPS URL`
              });
            }
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: `Image URL ${i + 1} is not a valid URL: ${imageUrl}`
            });
          }
        }
      }
      req.body.images = validImageUrls;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Seller (own products)
router.delete('/:id', protect, authorize('Seller', 'Admin'), checkOwnership(Product), async (req, res) => {
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
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/products/:id/like
// @desc    Like/Unlike a product
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const isLiked = product.likes.includes(req.user._id);

    if (isLiked) {
      product.likes = product.likes.filter(
        id => id.toString() !== req.user._id.toString()
      );
      product.likesCount = Math.max(0, product.likesCount - 1);
    } else {
      product.likes.push(req.user._id);
      product.likesCount += 1;
    }

    await product.save();

    res.json({
      success: true,
      data: {
        isLiked: !isLiked,
        likesCount: product.likesCount
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

