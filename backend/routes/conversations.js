import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/conversations
// @desc    Get all conversations for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username email')
      .populate('productId', 'name images price')
      .sort({ lastMessageTimestamp: -1 });
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
});

// @route   POST /api/conversations
// @desc    Create a new conversation
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { participantId, productId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required'
      });
    }
    
    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      ...(productId && { productId })
    });
    
    if (existingConversation) {
      return res.json({
        success: true,
        data: existingConversation
      });
    }
    
    const conversation = await Conversation.create({
      participants: [req.user._id, participantId],
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
    res.status(500).json({
      success: false,
      message: 'Error creating conversation',
      error: error.message
    });
  }
});

// @route   GET /api/conversations/:id
// @desc    Get a specific conversation
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    })
      .populate('participants', 'username email')
      .populate('productId', 'name images price');
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
});

export default router;

