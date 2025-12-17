import express from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { protect } from '../middleware/auth.js';

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

