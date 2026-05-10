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

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('\nPlease set these variables in your .env file.\n');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
// Increase body size limit to handle base64 images (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  res.json({ message: 'EverTrend API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  console.error('Request body size:', JSON.stringify(req.body).length);
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid JSON in request body. Request may be too large.' 
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      success: false,
      message: 'Request body too large. Please reduce image sizes.' 
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const BASE_PORT = Number(process.env.PORT) || 5001;
const MAX_PORT_PROBES = 5;

/**
 * Try to start the HTTP server on the provided port. If the port is
 * already taken we probe the next port (up to MAX_PORT_PROBES times)
 * so macOS system services that bind to :5000 do not block our dev server.
 * @param {number} port
 * @param {number} probes
 */
const attemptListen = (port, probes = 0) => {
  const server = app
    .listen(port, async () => {
      console.log(`\n✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
      console.log(`🌐 API available at: http://localhost:${port}/api`);
      console.log(`💚 Health check: http://localhost:${port}/api/health`);
      try {
        const { initializeSocket } = await import('./socket/socket.js');
        initializeSocket(server);
        console.log(`💬 Socket.io server initialized for real-time chat`);
      } catch (socketError) {
        console.error('Error initializing Socket.io:', socketError);
      }
      console.log(`\n📡 Server is ready and waiting for requests...\n`);
    })
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE' && probes < MAX_PORT_PROBES) {
        const nextPort = port + 1;
        console.warn(
          `Port ${port} is already in use. Trying port ${nextPort} instead (attempt ${probes + 1}/${MAX_PORT_PROBES}).`,
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

startServer();
