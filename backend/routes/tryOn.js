import express from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';
import { recommendFit } from '../services/fitRecommendationService.js';

const router = express.Router();

// Only authenticated buyers can access
router.use(protect);
router.use(authorize('Buyer'));

/**
 * POST /api/try-on
 * body: { productId: string, measurements?: { shoulder:number, chest:number, length:number } }
 * returns: { fitPercentage:number, overlay:{ x:number, y:number, scale:number, rotation:number }, processedImage?:string|null }
 *
 * NOTE: This currently uses our internal heuristic (recommendFit) as the "AI stub".
 * Swap `simulateAiProcessing` with a real TensorFlow/Python call later.
 */
router.post(
  '/',
  [
    body('productId').notEmpty().withMessage('productId is required'),
    body('measurements.shoulder').optional().isFloat({ min: 10, max: 100 }).withMessage('shoulder must be a valid number'),
    body('measurements.chest').optional().isFloat({ min: 20, max: 200 }).withMessage('chest must be a valid number'),
    body('measurements.length').optional().isFloat({ min: 20, max: 250 }).withMessage('length must be a valid number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { productId, measurements } = req.body;

      const product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const userMeasurements = measurements || req.user?.sizeProfile;
      if (!userMeasurements) {
        return res.status(400).json({
          success: false,
          message: 'User size profile not found. Please set shoulder, chest, and length in your profile.'
        });
      }

      if (!product.dimensions) {
        return res.status(400).json({
          success: false,
          message: 'Product dimensions not available for try-on.'
        });
      }

      const rec = recommendFit(userMeasurements, product.dimensions);

      // Dummy overlay coords; real AI would return better alignment.
      const overlay = {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0
      };

      return res.json({
        success: true,
        data: {
          fitPercentage: rec.fitPercentage,
          overlay,
          processedImage: null
        }
      });
    } catch (error) {
      console.error('try-on route error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Try-on failed' });
    }
  }
);

export default router;

