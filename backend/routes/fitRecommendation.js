import express from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { recommendFit } from '../services/fitRecommendationService.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/fit-recommendation/:productId
// @desc    Get fit recommendation for a product
// @access  Private
router.post('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { measurements } = req.body; // Optional: override user's size profile

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.dimensions) {
      return res.status(400).json({
        success: false,
        message: 'Product dimensions not available'
      });
    }

    // Get user size profile or use provided measurements
    let userSizeProfile;
    if (measurements) {
      userSizeProfile = measurements;
    } else {
      const user = await User.findById(req.user._id);
      userSizeProfile = user.sizeProfile;
    }

    if (!userSizeProfile) {
      return res.status(400).json({
        success: false,
        message: 'User size profile not found. Please provide measurements or update your profile.'
      });
    }

    // Get fit recommendation
    const recommendation = recommendFit(userSizeProfile, product.dimensions);

    res.json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        recommendation
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

