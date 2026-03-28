import express from 'express';
import { body, validationResult } from 'express-validator';
import { submitContact } from '../controllers/contactController.js';

const router = express.Router();

router.post(
  '/submit',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }).withMessage('Message cannot exceed 5000 characters')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const messages = errors.array().map((e) => e.msg);
      return res.status(400).json({
        success: false,
        message: messages.length ? messages[0] : 'Validation failed.'
      });
    }
    return submitContact(req, res).catch(next);
  }
);

export default router;
