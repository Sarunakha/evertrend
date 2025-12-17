import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// eSewa Test Environment Credentials
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

    const { amount, products = [] } = req.body;

    // Generate unique transaction UUID (must be unique per transaction)
    // eSewa accepts alphanumeric characters, hyphens, and underscores
    // Format: Keep it simple - alphanumeric only, max 40 characters
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transaction_uuid = `TXN${timestamp}${randomStr}`;

    // Calculate amounts - ensure all are strings with exactly 2 decimal places
    // Important: Use toFixed(2) to ensure exactly 2 decimal places
    const total_amount = parseFloat(amount).toFixed(2);
    const tax_amount = '0.00';
    const product_service_charge = '0.00';
    const product_delivery_charge = '0.00';
    
    // Validate amounts are valid numbers
    if (isNaN(parseFloat(total_amount)) || parseFloat(total_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }

    // Success and failure URLs (configurable via environment variable)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const success_url = `${frontendUrl}/payment/success`;
    const failure_url = `${frontendUrl}/payment/failure`;

    // Signed field names - order matters for signature generation
    // eSewa v2 requires: total_amount,transaction_uuid,product_code
    const signed_field_names = 'total_amount,transaction_uuid,product_code';

    // Create signature string in the EXACT order of signed_field_names
    // Format: value1,value2,value3 (comma-separated, no spaces, no trailing commas)
    // Values must match exactly what's sent in the form
    // Order: total_amount,transaction_uuid,product_code
    // CRITICAL: No spaces, no extra characters, exact match with form values
    const signatureString = `${total_amount},${transaction_uuid},${ESEWA_PRODUCT_CODE}`.trim();

    // Generate HMAC-SHA256 signature
    // Important: 
    // 1. Use the secret key exactly as provided (no encoding)
    // 2. The signature string must be in the exact order of signed_field_names
    // 3. All values must be strings with no extra whitespace
    // 4. Update with UTF-8 encoding
    // 5. Digest as base64
    const hmac = crypto.createHmac('sha256', ESEWA_SECRET_KEY);
    hmac.update(signatureString);
    const signature = hmac.digest('base64');
    
    // Verify signature generation
    if (!signature || signature.length === 0) {
      throw new Error('Failed to generate signature');
    }
    
    // Additional validation
    if (signature.includes(' ') || signature.includes('\n') || signature.includes('\r')) {
      throw new Error('Signature contains invalid characters');
    }

    // Prepare form data - ensure all values are strings
    const formData = {
      amount: total_amount,
      tax_amount: tax_amount,
      total_amount: total_amount,
      transaction_uuid: transaction_uuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: product_service_charge,
      product_delivery_charge: product_delivery_charge,
      success_url: success_url,
      failure_url: failure_url,
      signed_field_names: signed_field_names,
      signature: signature
    };

    // Debug logging (remove in production)
    console.log('eSewa Payment Data:', {
      signatureString: `"${signatureString}"`,
      signatureStringLength: signatureString.length,
      signature: signature.substring(0, 20) + '...',
      signatureLength: signature.length,
      transaction_uuid,
      total_amount,
      product_code: ESEWA_PRODUCT_CODE,
      formDataKeys: Object.keys(formData),
      formData: { 
        ...formData, 
        signature: '[HIDDEN]',
        signatureLength: signature.length
      }
    });
    
    // Validate all required fields are present and valid
    if (!total_amount || !transaction_uuid || !ESEWA_PRODUCT_CODE || !signature) {
      throw new Error('Missing required payment fields');
    }

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

