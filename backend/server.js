import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB, { isDatabaseConfigured } from './config/database.js';

dotenv.config();

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import sellerRoutes from './routes/sellers.js';
import fitRecommendationRoutes from './routes/fitRecommendation.js';
import cartRoutes from './routes/cart.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/paymentRoutes.js';
import loyaltyRoutes from './routes/loyalty.js';
import couponRoutes from './routes/coupons.js';
import adminRoutes from './routes/admin.js';
import refundRoutes from './routes/refundRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import vtoRoutes from './routes/vto.js';
import contactRoutes from './routes/contactRoutes.js';
import tryOnRoutes from './routes/tryOn.js';

const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';
const showDebugErrors = !isProduction || isPreview;

if (!isVercel) {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!isDatabaseConfigured()) missing.push('MONGODB_URI');
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
}

const app = express();

const buildAllowedOrigins = () => {
  const fromList = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return [
    process.env.FRONTEND_URL,
    ...fromList,
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173', // Added standard Vite port
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5173',
    'https://evertrend-frontend.vercel.app'
  ]
    .map((o) => o?.replace(/\/$/, ''))
    .filter(Boolean);
};

/** Allow Vercel frontends/backends (incl. git branch URLs like *-git-*-*.vercel.app) */
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  
  const normalized = origin.replace(/\/$/, '');
  
  // 1. Explicitly check our hardcoded list and environment variables
  if (buildAllowedOrigins().includes(normalized)) return true;

  // 2. Safely match any vercel production or preview URL domains
  if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(normalized)) return true;
  if (normalized.includes('evertrend-frontend')) return true;

  return false;
};

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
};

// Handle preflight before DB middleware (fixes "No Access-Control-Allow-Origin" on OPTIONS)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept, Origin'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, origin || true);
      }
      console.warn('CORS rejected origin:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root — no database required (fixes blank 503 when opening deployment URL)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EverTrend API',
    docs: 'Use /api/health to check status',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  });
});

// Health check — reports DB status without blocking the whole app
app.get('/api/health', async (req, res) => {
  const payload = {
    success: true,
    message: 'EverTrend API is running',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    database: {
      configured: isDatabaseConfigured(),
      connected: false
    }
  };

  if (!isDatabaseConfigured()) {
    payload.database.error = 'MONGODB_URI not set in environment variables';
    if (showDebugErrors) {
      payload.hint =
        'Vercel → Settings → Environment Variables → add MONGODB_URI and enable it for Preview (development branch deploys use Preview).';
    }
    return res.status(200).json(payload);
  }

  try {
    await connectDB();
    payload.database.connected = true;
    return res.json(payload);
  } catch (error) {
    payload.success = false;
    payload.database.connected = false;
    payload.database.error = showDebugErrors
      ? error.message
      : 'Unable to connect to database';
    if (showDebugErrors) {
      payload.hint =
        'Check MongoDB Atlas: Network Access → allow 0.0.0.0/0, and verify MONGODB_URI in Vercel Preview env vars.';
    }
    return res.status(503).json(payload);
  }
});

const dbMiddleware = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  if (!isDatabaseConfigured()) {
    applyCorsHeaders(req, res);
    return res.status(503).json({
      success: false,
      message: 'Database is not configured.',
      ...(showDebugErrors && {
        detail: 'Set MONGODB_URI in Vercel Environment Variables (Preview scope for development branch).'
      })
    });
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    applyCorsHeaders(req, res);
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again later.',
      ...(showDebugErrors && { detail: error.message })
    });
  }
};

if (isVercel) {
  app.use('/api', (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.path === '/health') return next();
    return dbMiddleware(req, res, next);
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/fit-recommendation', fitRecommendationRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/vto', vtoRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/try-on', tryOnRoutes);

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message);
  if (showDebugErrors) console.error('Error stack:', err.stack);

  applyCorsHeaders(req, res);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data. Please check your input and try again.'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request is too large. Please reduce image sizes and try again.'
    });
  }

  const statusCode = err.statusCode || 500;
  const clientMessage =
    isProduction && !showDebugErrors && statusCode === 500
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Something went wrong!';

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(showDebugErrors && { stack: err.stack })
  });
});

const BASE_PORT = Number(process.env.PORT) || 5001;
const MAX_PORT_PROBES = 5;

const attemptListen = (port, probes = 0) => {
  const server = app
    .listen(port, async () => {
      console.log(`\n✅ Server running on port ${port}`);
      console.log(`🌐 API: http://localhost:${port}/api`);
      console.log(`💚 Health: http://localhost:${port}/api/health`);

      if (!isVercel) {
        try {
          const { initializeSocket } = await import('./socket/socket.js');
          initializeSocket(server);
          console.log('💬 Socket.io initialized');
        } catch (socketError) {
          console.error('Socket.io error:', socketError);
        }
      }
    })
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE' && probes < MAX_PORT_PROBES) {
        attemptListen(port + 1, probes + 1);
        return;
      }
      console.error(`Failed to start server on port ${port}:`, error);
      process.exit(1);
    });

  return server;
};

const startServer = async () => {
  await connectDB();
  attemptListen(BASE_PORT);
};

if (!isVercel) {
  startServer().catch((err) => {
    console.error('Unable to start server:', err);
    process.exit(1);
  });
}

export default app;