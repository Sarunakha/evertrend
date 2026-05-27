import express from 'express';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const isDev = process.env.NODE_ENV !== 'production';
const devMockEnabled = process.env.ESEWA_DEV_MOCK !== 'false';

const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_FORM_URL = (
  process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
).replace(/\/$/, '');

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/$/, '');

const formatEsewaAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) throw new Error('Invalid payment amount');
  const fixed = num.toFixed(2);
  return fixed.endsWith('.00') ? String(Math.round(num)) : fixed;
};

const generateTransactionUuid = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${Date.now()}-${id}`;
};

const generateEsewaSignature = (totalAmount, transactionUuid, productCode) => {
  const signatureString = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(signatureString, 'utf8').digest('base64');
};

const buildEsewaPaymentPayload = ({ amount, transactionUuid, orderId }) => {
  const amountStr = formatEsewaAmount(amount);
  const tax_amount = '0';
  const product_service_charge = '0';
  const product_delivery_charge = '0';
  const total_amount = formatEsewaAmount(
    Number(amountStr) +
      Number(tax_amount) +
      Number(product_service_charge) +
      Number(product_delivery_charge)
  );
  const transaction_uuid = String(transactionUuid);
  const product_code = ESEWA_PRODUCT_CODE;
  const signature = generateEsewaSignature(total_amount, transaction_uuid, product_code);
  const frontendUrl = getFrontendUrl();
  const orderQuery = orderId ? `?orderId=${orderId}` : '';

  const formData = {
    amount: amountStr,
    tax_amount,
    product_service_charge,
    product_delivery_charge,
    total_amount,
    transaction_uuid,
    product_code,
    success_url: `${frontendUrl}/payment/success${orderQuery}`,
    failure_url: `${frontendUrl}/payment/failure${orderQuery}`,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature
  };

  return { formData };
};

/** Check if eSewa sandbox accepts POST (rc-epay often returns 404 when UAT is down) */
const probeEsewaGateway = async (formData) => {
  try {
    const response = await fetch(ESEWA_FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData),
      redirect: 'manual'
    });
    if (response.status >= 300 && response.status < 400) {
      return { ok: true, redirectUrl: response.headers.get('location') };
    }
    if (response.status === 404) {
      return { ok: false, reason: 'eSewa sandbox endpoint returned 404 (UAT may be offline)' };
    }
    const text = await response.text();
    return {
      ok: false,
      reason: `eSewa returned HTTP ${response.status}: ${text.slice(0, 120)}`
    };
  } catch (err) {
    return { ok: false, reason: err.message || 'Cannot reach eSewa' };
  }
};

const completeOrderForDevMock = async (order) => {
  order.status = 'Processing';
  order.transactionId = order.transactionId || `DEV-${Date.now()}`;
  await order.save();
  return order;
};

// @route   POST /api/payment/esewa
router.post(
  '/esewa',
  protect,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('orderId').isMongoId().withMessage('Valid order ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { amount, orderId } = req.body;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      if (order.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this order' });
      }
      if (order.paymentMethod !== 'eSewa') {
        return res.status(400).json({ success: false, message: 'Order is not an eSewa payment' });
      }
      if (order.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'This order is already paid or no longer pending'
        });
      }

      const payAmount = Number(order.totalAmount);
      if (Math.abs(payAmount - Number(amount)) > 0.01) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount does not match order total'
        });
      }

      const transaction_uuid = generateTransactionUuid();
      order.transactionId = transaction_uuid;
      await order.save();

      const { formData } = buildEsewaPaymentPayload({
        amount: payAmount,
        transactionUuid: transaction_uuid,
        orderId: order._id
      });

      const gateway = await probeEsewaGateway(formData);
      const apiOrigin = `${req.protocol}://${req.get('host')}`;
      const submitUrl = `${apiOrigin}/api/payment/esewa/submit?orderId=${order._id}`;

      if (!gateway.ok && isDev && devMockEnabled) {
        return res.json({
          success: true,
          data: {
            gatewayAvailable: false,
            gatewayMessage: gateway.reason,
            devMock: true,
            redirectUrl: `${getFrontendUrl()}/payment/success?orderId=${order._id}&devMock=1`,
            transaction_uuid,
            orderId: order._id
          }
        });
      }

      if (!gateway.ok) {
        return res.status(502).json({
          success: false,
          message:
            'eSewa payment gateway is unavailable. The sandbox URL documented at developer.esewa.com.np is not accepting payments right now. Please try again later or contact eSewa support.',
          detail: gateway.reason
        });
      }

      res.json({
        success: true,
        data: {
          gatewayAvailable: true,
          formUrl: ESEWA_FORM_URL,
          formData,
          submitUrl,
          transaction_uuid,
          orderId: order._id
        }
      });
    } catch (error) {
      console.error('eSewa payment generation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate payment form'
      });
    }
  }
);

// @route   GET /api/payment/esewa/submit
// Server POSTs to eSewa and redirects browser to login (never GET the /form URL)
router.get('/submit', protect, async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).send('Missing orderId');
    }

    const order = await Order.findById(orderId);
    if (!order || order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).send('Not authorized');
    }
    if (!order.transactionId) {
      return res.status(400).send('Payment session expired. Start checkout again.');
    }

    const { formData } = buildEsewaPaymentPayload({
      amount: order.totalAmount,
      transactionUuid: order.transactionId,
      orderId: order._id
    });

    const gateway = await probeEsewaGateway(formData);

    if (!gateway.ok) {
      if (isDev && devMockEnabled) {
        await completeOrderForDevMock(order);
        return res.redirect(`${getFrontendUrl()}/payment/success?orderId=${order._id}&devMock=1`);
      }
      return res.status(502).send(
        `<h1>eSewa unavailable</h1><p>${gateway.reason}</p><p>The sandbox at rc-epay.esewa.com.np is returning 404. This is an eSewa server issue, not your app. Try again later or enable ESEWA_DEV_MOCK=true for local testing.</p>`
      );
    }

    if (gateway.redirectUrl) {
      return res.redirect(gateway.redirectUrl);
    }

    res.status(502).send('eSewa did not return a redirect URL.');
  } catch (error) {
    console.error('eSewa submit error:', error);
    res.status(500).send('Failed to start eSewa payment');
  }
});

// @route   POST /api/payment/esewa/dev-complete
router.post('/dev-complete', protect, async (req, res) => {
  if (!isDev) {
    return res.status(404).json({ success: false, message: 'Not available' });
  }

  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order || order.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await completeOrderForDevMock(order);

  res.json({
    success: true,
    message: 'Dev payment completed (eSewa sandbox bypassed)',
    data: { order }
  });
});

export default router;
