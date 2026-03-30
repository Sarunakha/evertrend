import express from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/conversations/access
// @desc    Find or create a conversation between the current user (buyer) and a seller
// @access  Private
router.post('/access', protect, async (req, res) => {
  try {
    const { sellerId, productId } = req.body;

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: 'sellerId is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid seller ID'
      });
    }

    const buyerId = req.user._id;
    if (sellerId.toString() === buyerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot message yourself'
      });
    }

    const seller = await User.findById(sellerId).select('_id');
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    const productObjectId =
      productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null;

    const matchQuery = {
      participants: { $all: [buyerId, sellerId] }
    };
    if (productObjectId) {
      matchQuery.productId = productObjectId;
    }

    let conversation = await Conversation.findOne(matchQuery)
      .populate('participants', 'username email')
      .populate('productId', 'name images price');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [buyerId, sellerId],
        productId: productObjectId
      });
      await conversation.populate('participants', 'username email');
      if (productObjectId) {
        await conversation.populate('productId', 'name images price');
      }
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Conversation access error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error accessing conversation'
    });
  }
});

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

