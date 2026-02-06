import express from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { getIO, getActiveUsers } from '../socket/socket.js';

const router = express.Router();

// @route   GET /api/messages/conversation/:conversationId
// @desc    Get all messages in a conversation
// @access  Private
router.get('/conversation/:conversationId', protect, async (req, res) => {
  try {
    // Verify user is a participant
    const conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }
    
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
      .populate('senderId', 'username email')
      .sort({ timestamp: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        senderId: { $ne: req.user._id },
        isRead: false
      },
      { isRead: true }
    );
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    
    if (!conversationId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID and content are required'
      });
    }
    
    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages in this conversation'
      });
    }
    
    const message = await Message.create({
      conversationId,
      senderId: req.user._id,
      content
    });
    
    // Update conversation's last message timestamp
    conversation.lastMessageTimestamp = Date.now();
    await conversation.save();
    
    await message.populate('senderId', 'username email');

    // Get receiver ID for notification and socket
    const receiverId = conversation.participants.find(
      p => p.toString() !== req.user._id.toString()
    );
    const senderName = req.user.username || req.user.email || 'Someone';

    // Create notification for the recipient
    if (receiverId) {
      try {
        const notification = await Notification.create({
          recipientId: receiverId,
          senderId: req.user._id,
          type: 'NEW_MESSAGE',
          message: `You have a new message from ${senderName}.`,
          relatedId: conversation._id,
          isRead: false
        });
        // Emit new notification in real-time so recipient's bell updates
        try {
          const io = getIO();
          const activeUsers = getActiveUsers();
          const receiverSocketId = activeUsers.get(String(receiverId));
          if (io && receiverSocketId) {
            io.to(receiverSocketId).emit('newNotification', {
              _id: notification._id,
              message: notification.message,
              type: notification.type,
              relatedId: notification.relatedId,
              createdAt: notification.createdAt
            });
          }
        } catch (socketErr) {
          console.error('Error emitting newNotification:', socketErr);
        }
      } catch (notificationError) {
        console.error('Error creating message notification:', notificationError);
      }
    }
    
    // Emit real-time message via Socket.io to both sender and receiver
    try {
      const io = getIO();
      if (io) {
        // Prepare message data with all IDs as strings
        const messageData = {
          conversationId: String(conversation._id),
          senderId: String(req.user._id),
          sender: {
            _id: String(req.user._id),
            username: req.user.username || 'Unknown',
            email: req.user.email || ''
          },
          content: message.content,
          timestamp: message.timestamp || message.createdAt || new Date(),
          _id: String(message._id)
        };

        const activeUsers = getActiveUsers();
        const senderIdStr = String(req.user._id);
        
        // Emit to receiver if they're online
        if (receiverId) {
          const receiverIdStr = String(receiverId);
          const receiverSocketId = activeUsers.get(receiverIdStr);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('getMessage', messageData);
          }
        }
        
        // Also emit to sender so they can see their own message in real-time
        const senderSocketId = activeUsers.get(senderIdStr);
        if (senderSocketId) {
          io.to(senderSocketId).emit('getMessage', messageData);
        }
      }
    } catch (socketError) {
      console.error('Error emitting socket message:', socketError);
      // Don't fail the API request if socket emission fails
    }
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Verify user is a participant
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    message.isRead = true;
    await message.save();
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating message',
      error: error.message
    });
  }
});

export default router;

