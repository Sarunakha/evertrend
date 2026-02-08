import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const activeUsers = new Map();
let ioInstance = null;

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3002',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: No token provided'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username email role');
      if (!user) return next(new Error('Authentication error: User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    activeUsers.set(socket.userId, socket.id);
    io.emit('userOnline', { userId: socket.userId });

    socket.on('addUser', (userId) => {
      activeUsers.set(userId, socket.id);
      io.emit('userOnline', { userId });
    });

    socket.on('typing', (data) => {
      const { conversationId, receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userTyping', {
          conversationId,
          userId: socket.userId,
          username: socket.user?.username
        });
      }
    });

    socket.on('stopTyping', (data) => {
      const { conversationId, receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('userStopTyping', { conversationId, userId: socket.userId });
      }
    });

    socket.on('disconnect', () => {
      activeUsers.delete(socket.userId);
      io.emit('userOffline', { userId: socket.userId });
    });
  });

  ioInstance = io;
  return io;
};

export const getActiveUsers = () => activeUsers;
export const getIO = () => ioInstance;
