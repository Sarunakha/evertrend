import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Retrieve keys from production environment variables dynamically
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

// @route   POST /api/payment/esewa
// @desc    Generate eSewa payment form data
// @access  Private
router.post('/esewa', [
  protect,
  body('amount').isNumeric().withMessage('Valid amount is required'),
  body('orderId').notEmpty().withMessage('OrderId is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Capture variables from request body
    const { amount, orderId } = req.body;

    // 1. Force formatting to match what eSewa's v2 gateway parses
    const baseAmount = parseFloat(amount).toFixed(1); // eSewa sandbox uses single decimals comfortably (e.g. 100.0)
    const tax_amount = '0.0';
    const product_service_charge = '0.0';
    const product_delivery_charge = '0.0';
    const total_amount = baseAmount; 

    // 2. Map clean strings (Strict: No whitespace inside the string)
    const totalAmountStr = String(total_amount);
    const transactionUuidStr = String(orderId); // Using actual tracking orderId prevents ghost payments
    const productCodeStr = String(ESEWA_PRODUCT_CODE);

    // 3. Generate Signature using HMAC-SHA256
    const signatureString = `total_amount=${totalAmountStr},transaction_uuid=${transactionUuidStr},product_code=${productCodeStr}`;

    const hmac = crypto.createHmac('sha256', ESEWA_SECRET_KEY);
    hmac.update(signatureString, 'utf8');
    const signature = hmac.digest('base64');

    // 4. Update Redirections to hit Backend FIRST, then route to frontend
    const backendUrl = process.env.BACKEND_URL || 'https://evertrend-backend.vercel.app';
    const success_url = `${backendUrl}/api/payment/esewa/submit`;
    const failure_url = `${backendUrl}/api/payment/esewa/failure`;

    // 5. Build clean, typed Form Data parameters
    const formData = {
      amount: baseAmount,
      failure_url: failure_url,
      product_delivery_charge: product_delivery_charge,
      product_service_charge: product_service_charge,
      product_code: ESEWA_PRODUCT_CODE,
      signature: signature,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      success_url: success_url,
      tax_amount: tax_amount,
      total_amount: totalAmountStr,
      transaction_uuid: transactionUuidStr
    };

    return res.json({
      success: true,
      data: {
        formUrl: ESEWA_FORM_URL,
        formData: formData
      }
    });

  } catch (error) {
    console.error('eSewa payment generation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate payment form'
    });
  }
});

// @route   GET /api/payment/esewa/submit
// @desc    Capture eSewa success callback query, verify, and redirect user
// @access  Public
router.get('/esewa/submit', async (req, res) => {
  try {
    // eSewa appends transaction data securely via query string parameter '?data=...'
    const { data } = req.query;

    if (!data) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://evertrend-frontend.vercel.app'}/payment/failure`);
    }

    // Decode base64 payload response from eSewa
    const decodedString = Buffer.from(data, 'base64').toString('utf-8');
    const decodedData = JSON.parse(decodedString);

    // Look at status returned by eSewa
    if (decodedData.status === 'COMPLETE') {
      // Find your order using decodedData.transaction_uuid and flag it as active/paid in MongoDB here!
      
      return res.redirect(`${process.env.FRONTEND_URL || 'https://evertrend-frontend.vercel.app'}/payment/success?txn=${decodedData.transaction_uuid}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://evertrend-frontend.vercel.app'}/payment/failure`);
    }
  } catch (error) {
    console.error("eSewa verification callback crashed:", error);
    return res.redirect(`${process.env.FRONTEND_URL || 'https://evertrend-frontend.vercel.app'}/payment/failure`);
  }
});

export default router;