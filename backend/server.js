import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/database.js';

// Load environment variables EARLY (before importing routes/utils that may read process.env)
dotenv.config();

// Import routes
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

// Validate required environment variables (skip hard exit on Vercel build — validate at runtime)
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI', 'MONGO_URI'];
const hasMongo = process.env.MONGODB_URI || process.env.MONGO_URI;
const missingEnvVars = ['JWT_SECRET'].filter((key) => !process.env[key]);
if (!hasMongo) missingEnvVars.push('MONGODB_URI');

if (missingEnvVars.length > 0 && !isVercel) {
  console.error('\n❌ Missing required environment variables:');
  missingEnvVars.forEach((envVar) => console.error(`   - ${envVar}`));
  console.error('\nPlease set these variables in your .env file.\n');
  process.exit(1);
}

const app = express();

// CORS — allow frontend URL in production; permissive in local dev
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002'
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!isProduction) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
  })
);

// Increase body size limit to handle base64 images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure MongoDB is connected on serverless (Vercel) before handling requests
if (isVercel) {
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('Database connection failed:', error.message);
      res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.'
      });
    }
  });
}

// Routes
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

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ message: 'EverTrend API is running', environment: isProduction ? 'production' : 'development' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message);
  if (!isProduction) {
    console.error('Error stack:', err.stack);
    console.error('Request body size:', JSON.stringify(req.body || {}).length);
  }

  if (err.message?.includes('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: 'Request not allowed from this origin.'
    });
  }

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
    isProduction && statusCode === 500
      ? 'Something went wrong. Please try again later.'
      : err.message || 'Something went wrong!';

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(!isProduction && { stack: err.stack })
  });
});

const BASE_PORT = Number(process.env.PORT) || 5001;
const MAX_PORT_PROBES = 5;

const attemptListen = (port, probes = 0) => {
  const server = app
    .listen(port, async () => {
      console.log(`\n✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      console.log(`🌐 API available at: http://localhost:${port}/api`);
      console.log(`💚 Health check: http://localhost:${port}/api/health`);

      // Socket.io requires a persistent Node server — not available on Vercel serverless
      if (!isVercel) {
        try {
          const { initializeSocket } = await import('./socket/socket.js');
          initializeSocket(server);
          console.log('💬 Socket.io server initialized for real-time chat');
        } catch (socketError) {
          console.error('Error initializing Socket.io:', socketError);
        }
      }

      console.log('\n📡 Server is ready and waiting for requests...\n');
    })
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE' && probes < MAX_PORT_PROBES) {
        const nextPort = port + 1;
        console.warn(
          `Port ${port} is already in use. Trying port ${nextPort} instead (attempt ${probes + 1}/${MAX_PORT_PROBES}).`
        );
        attemptListen(nextPort, probes + 1);
        return;
      }

      console.error(`Failed to start server on port ${port}:`, error);
      console.error('If you explicitly set PORT, free the port or pick a different value.');
      process.exit(1);
    });

  return server;
};

const startServer = async () => {
  try {
    await connectDB();
    attemptListen(BASE_PORT);
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Local development: start HTTP server. Vercel: export app only (no listen).
if (!isVercel) {
  startServer();
}

// ESM export for @vercel/node (package.json has "type": "module")
export default app;

// CommonJS interop for tooling that expects module.exports
// eslint-disable-next-line no-undef
if (typeof module !== 'undefined') {
  module.exports = app;
}
