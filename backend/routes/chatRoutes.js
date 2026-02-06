import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';
import { getActiveUsers } from '../socket/socket.js';

const router = express.Router();

// @route   POST /api/chat/conversation
// @desc    Create a new conversation or fetch existing one between senderId and receiverId
// @access  Private
router.post('/conversation', protect, async (req, res) => {
  try {
    const { receiverId, productId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    // Prevent users from chatting with themselves
    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a conversation with yourself'
      });
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, receiverId] },
      ...(productId && { productId })
    })
      .populate('participants', 'username email')
      .populate('productId', 'name images price');

    if (existingConversation) {
      return res.json({
        success: true,
        data: existingConversation
      });
    }

    // Create new conversation
    const conversation = await Conversation.create({
      participants: [req.user._id, receiverId],
      productId: productId || null
    });

    await conversation.populate('participants', 'username email');
    if (productId) {
      await conversation.populate('productId', 'name images price');
    }

    res.status(201).json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error creating/fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation',
      error: error.message
    });
  }
});

// @route   GET /api/chat/:userId
// @desc    Get all conversations for a user (to populate chat sidebar)
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    // Verify user is requesting their own conversations
    if (req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user\'s conversations'
      });
    }

    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username email')
      .populate('productId', 'name images price')
      .sort({ lastMessageTimestamp: -1 });

    // Get last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({
          conversationId: conv._id
        })
          .populate('senderId', 'username email')
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          ...conv.toObject(),
          lastMessage: lastMessage || null
        };
      })
    );

    res.json({
      success: true,
      data: conversationsWithLastMessage
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
});

// @route   GET /api/chat/conversation/:conversationId/messages
// @desc    Get chat history for a conversation
// @access  Private
router.get('/conversation/:conversationId/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify user is a participant
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
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
});

export default router;
