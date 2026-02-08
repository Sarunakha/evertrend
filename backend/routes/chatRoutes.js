import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/chat/:userId
// @desc    Get all conversations for a user (by userId)
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    if (req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'username email')
      .populate('productId', 'name images price')
      .sort({ lastMessageTimestamp: -1 });
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('Error fetching chat conversations:', error);
    res.status(500).json({ success: false, message: 'Error fetching conversations' });
  }
});

// @route   GET /api/chat/conversation/:conversationId/messages
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversation/:conversationId/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('senderId', 'username email')
      .sort({ timestamp: 1 });
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        senderId: { $ne: req.user._id },
        isRead: false
      },
      { isRead: true }
    );
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
});

export default router;
