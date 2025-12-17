import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  lastMessageTimestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for finding conversations by participants
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTimestamp: -1 });

export default mongoose.model('Conversation', conversationSchema);

