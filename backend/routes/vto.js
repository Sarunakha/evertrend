import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { calculateFit } from '../controllers/vtoController.js';

const router = express.Router();

router.post(
  '/calculate-fit',
  protect,
  [body('productId').notEmpty().withMessage('productId is required')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0]?.msg || 'Validation failed'
      });
    }
    return calculateFit(req, res).catch(next);
  }
);

export default router;

