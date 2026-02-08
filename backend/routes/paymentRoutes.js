import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// eSewa Test Environment Credentials
// In a real app, these should be in process.env
const ESEWA_PRODUCT_CODE = 'EPAYTEST';
const ESEWA_SECRET_KEY = '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

// @route   POST /api/payment/esewa
// @desc    Generate eSewa payment form data
// @access  Private
router.post('/esewa', [
  protect,
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('products').optional().isArray().withMessage('Products must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount } = req.body;

    // 1. Generate unique transaction UUID
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transaction_uuid = `TXN${timestamp}${randomStr}`;

    // 2. Define Charges & Tax
    // eSewa requires strict decimal formatting (usually 2 decimal places)
    const tax_amount = '0.00';  // Set to 0 for simplicity, or calculate based on logic
    const product_service_charge = '0.00';
    const product_delivery_charge = '0.00';

    // 3. Calculate Total Amount
    // The total amount sent to eSewa MUST be the sum of (amount + tax + charges)
    const baseAmount = parseFloat(amount);
    const taxAmount = parseFloat(tax_amount);
    const serviceCharge = parseFloat(product_service_charge);
    const deliveryCharge = parseFloat(product_delivery_charge);
    
    // total_amount = 100 + 0 + 0 + 0 = 100.00
    const total_amount = (baseAmount + taxAmount + serviceCharge + deliveryCharge).toFixed(2);

    // 4. Convert all fields to strings for Signature Generation
    const totalAmountStr = String(total_amount);
    const transactionUuidStr = String(transaction_uuid);
    const productCodeStr = String(ESEWA_PRODUCT_CODE);

    // 5. Generate Signature (eSewa v2: key=value format)
    const signatureString = `total_amount=${totalAmountStr},transaction_uuid=${transactionUuidStr},product_code=${productCodeStr}`;

    const hmac = crypto.createHmac('sha256', ESEWA_SECRET_KEY);
    hmac.update(signatureString, 'utf8');
    const signature = hmac.digest('base64');

    // 6. Configurable Success/Failure URLs
    // Ensure these point to your frontend routes
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002'; // Adjust port if needed
    const success_url = `${frontendUrl}/payment/success`;
    const failure_url = `${frontendUrl}/payment/failure`;

    // 7. Prepare Form Data
    // CRITICAL: 'amount' field in form is the PRODUCT PRICE, not the total.
    // 'total_amount' is the SUM.
    // Since tax is 0, they happen to be equal here, but logically they are different fields.
    const formData = {
      amount: baseAmount.toFixed(2), // Product Price
      failure_url: failure_url,
      product_delivery_charge: product_delivery_charge,
      product_service_charge: product_service_charge,
      product_code: ESEWA_PRODUCT_CODE,
      signature: signature,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      success_url: success_url,
      tax_amount: tax_amount,
      total_amount: totalAmountStr, // The sum used in signature
      transaction_uuid: transactionUuidStr
    };

    res.json({
      success: true,
      data: {
        formUrl: ESEWA_FORM_URL,
        formData: formData
      }
    });

  } catch (error) {
    console.error('eSewa payment generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate payment form'
    });
  }
});

export default router;