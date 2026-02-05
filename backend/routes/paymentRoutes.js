import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// eSewa Payment Gateway Configuration
// ============================================================================

// Test Environment Credentials
// For testing, use these credentials:
const ESEWA_PRODUCT_CODE = 'EPAYTEST';
const ESEWA_SECRET_KEY = '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

// Production Environment (uncomment and set via environment variables)
// const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE;
// const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY;
// const ESEWA_FORM_URL = 'https://epay.esewa.com.np/api/epay/main/v2/form';

// ============================================================================
// eSewa Testing Credentials
// ============================================================================
// For testing payments, use these eSewa test accounts:
// 
// Test eSewa IDs: 9806800001, 9806800002, 9806800003, 9806800004, 9806800005
// Password: Nepal@123
// MPIN: 1122 (for mobile application only)
// Token: 123456
//
// Merchant Wallet (Production): https://merchant.esewa.com.np
// - Each client receives a merchant wallet to view payments
// ============================================================================

/**
 * Generate eSewa v2 signature
 * @param {string} total_amount - Total amount as string (e.g., "100.00")
 * @param {string} transaction_uuid - Transaction UUID as string
 * @param {string} product_code - Product code as string
 * @param {string} secret_key - Secret key for HMAC
 * @returns {string} Base64 encoded HMAC-SHA256 signature
 */
const generateEsewaSignature = (total_amount, transaction_uuid, product_code, secret_key) => {
  // CRITICAL: Format must be exactly "total_amount={value},transaction_uuid={value},product_code={value}"
  // - Field names with equals signs
  // - NO spaces after commas
  // - Exact order: total_amount, transaction_uuid, product_code
  const signatureString = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  
  // Generate HMAC-SHA256 hash
  const hmac = crypto.createHmac('sha256', secret_key);
  hmac.update(signatureString, 'utf8');
  const signature = hmac.digest('base64');
  
  return signature;
};

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
    // CRITICAL: Use toFixed(2) to ensure exactly 2 decimal places, then convert to string
    // This ensures the string format matches what we send in the form
    const total_amount = (baseAmount + taxAmount + serviceCharge + deliveryCharge).toFixed(2);

    // 4. Convert all fields to strings for Signature Generation
    // CRITICAL: Use the exact same string format that will be sent in the form
    // No trimming, no extra formatting - use the exact values
    // Ensure total_amount is exactly 2 decimal places (e.g., "100.00" not "100" or "100.0")
    const totalAmountStr = String(total_amount);
    const transactionUuidStr = String(transaction_uuid);
    const productCodeStr = String(ESEWA_PRODUCT_CODE);

    // 5. Generate Signature using the helper function
    const signature = generateEsewaSignature(
      totalAmountStr,
      transactionUuidStr,
      productCodeStr,
      ESEWA_SECRET_KEY
    );

    // Debug logging (remove in production)
    console.log('eSewa Signature Generation:');
    console.log('  Total Amount (string):', totalAmountStr, '(type:', typeof totalAmountStr + ')');
    console.log('  Transaction UUID:', transactionUuidStr);
    console.log('  Product Code:', productCodeStr);
    console.log('  Signature String Format:', `total_amount=${totalAmountStr},transaction_uuid=${transactionUuidStr},product_code=${productCodeStr}`);
    console.log('  Generated Signature:', signature);

    // 6. Configurable Success/Failure URLs
    // Ensure these point to your frontend routes
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002'; // Adjust port if needed
    const success_url = `${frontendUrl}/payment/success`;
    const failure_url = `${frontendUrl}/payment/failure`;

    // 7. Prepare Form Data
    // CRITICAL: 'amount' field in form is the PRODUCT PRICE, not the total.
    // 'total_amount' is the SUM.
    // Since tax is 0, they happen to be equal here, but logically they are different fields.
    // CRITICAL: Use the EXACT same string values used in signature generation
    // IMPORTANT: All values must be strings, and signed fields must match signature exactly
    const formData = {
      amount: String(baseAmount.toFixed(2)), // Product Price - ensure it's a string
      failure_url: String(failure_url),
      product_delivery_charge: String(product_delivery_charge),
      product_service_charge: String(product_service_charge),
      product_code: String(productCodeStr), // Use the same string used in signature
      signature: String(signature), // Signature must be a string
      signed_field_names: 'total_amount,transaction_uuid,product_code', // Exact format required
      success_url: String(success_url),
      tax_amount: String(tax_amount),
      total_amount: String(totalAmountStr), // CRITICAL: Must match exactly what was used in signature
      transaction_uuid: String(transactionUuidStr) // CRITICAL: Must match exactly what was used in signature
    };

    // Final validation: Ensure all required fields are present and non-empty
    const requiredFields = ['amount', 'total_amount', 'transaction_uuid', 'product_code', 'signature', 'signed_field_names', 'success_url', 'failure_url', 'tax_amount', 'product_service_charge', 'product_delivery_charge'];
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field] === '');
    if (missingFields.length > 0) {
      throw new Error(`Missing required form fields: ${missingFields.join(', ')}`);
    }

    // Debug: Log final form data (without signature for security)
    console.log('Final eSewa Form Data (signature hidden):');
    console.log('  Form URL:', ESEWA_FORM_URL);
    console.log('  Amount:', formData.amount);
    console.log('  Total Amount:', formData.total_amount);
    console.log('  Transaction UUID:', formData.transaction_uuid);
    console.log('  Product Code:', formData.product_code);
    console.log('  Signature Length:', formData.signature.length);
    console.log('  Success URL:', formData.success_url);
    console.log('  Failure URL:', formData.failure_url);

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

// @route   GET /api/payment/test-signature
// @desc    Test signature generation (for debugging)
// @access  Private
router.get('/test-signature', protect, (req, res) => {
  try {
    // Test with sample data
    const testTotalAmount = '999.00';
    const testTransactionUuid = 'TXN1234567890ABCD';
    const testProductCode = 'EPAYTEST';
    
    const signature = generateEsewaSignature(
      testTotalAmount,
      testTransactionUuid,
      testProductCode,
      ESEWA_SECRET_KEY
    );
    
    const signatureString = `total_amount=${testTotalAmount},transaction_uuid=${testTransactionUuid},product_code=${testProductCode}`;
    
    res.json({
      success: true,
      test: {
        total_amount: testTotalAmount,
        transaction_uuid: testTransactionUuid,
        product_code: testProductCode,
        signatureString: signatureString,
        generatedSignature: signature,
        secretKey: '8gBm/:&EnhH.1/q (test key)',
        formUrl: ESEWA_FORM_URL
      },
      instructions: {
        step1: 'Verify signature string format matches exactly',
        step2: 'Check that signature is Base64 encoded',
        step3: 'Ensure all values are strings (not numbers)',
        step4: 'Test credentials: ID=9806800001, Password=Nepal@123'
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