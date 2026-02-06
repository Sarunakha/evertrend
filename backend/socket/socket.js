import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Store active users: userId -> socketId
const activeUsers = new Map();
let ioInstance = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3002',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username email role');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.user.username})`);
    
    // Add user to active users map
    activeUsers.set(socket.userId, socket.id);

    // Emit user online status to all connected clients
    io.emit('userOnline', { userId: socket.userId });

    // Handle user adding themselves (for reconnection)
    socket.on('addUser', (userId) => {
      activeUsers.set(userId, socket.id);
      io.emit('userOnline', { userId });
      console.log(`User added to active users: ${userId}`);
    });

    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, receiverId, message } = data;

        // Find receiver's socket ID
        const receiverSocketId = activeUsers.get(receiverId);

        // Emit message to receiver if they're online
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('getMessage', {
            conversationId,
            senderId: socket.userId,
            sender: {
              _id: socket.userId,
              username: socket.user.username,
              email: socket.user.email
            },
            content: message,
            timestamp: new Date()
          });
        }

        // Also emit back to sender for confirmation (optional)
        socket.emit('messageSent', {
          conversationId,
          success: true
        });

        console.log(`Message sent from ${socket.userId} to ${receiverId}`);
      } catch (error) {
        console.error('Error handling sendMessage:', error);
        socket.emit('messageError', {
          error: 'Failed to send message'
        });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { conversationId, receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', {
          conversationId,
          userId: socket.userId,
          username: socket.user.username
        });
      }
    });

    // Handle stop typing
    socket.on('stopTyping', (data) => {
      const { conversationId, receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userStopTyping', {
          conversationId,
          userId: socket.userId
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      activeUsers.delete(socket.userId);
      io.emit('userOffline', { userId: socket.userId });
    });
  });

  ioInstance = io;
  return io;
};

/**
 * Get active users map (for external use)
 */
export const getActiveUsers = () => activeUsers;

/**
 * Get Socket.io instance (for emitting events from routes)
 */
export const getIO = () => ioInstance;
