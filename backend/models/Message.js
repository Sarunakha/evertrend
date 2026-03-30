import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['chat', 'contact_form'],
    default: 'chat',
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: function() {
      return this.type === 'chat';
    },
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'chat';
    },
    index: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  senderName: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  senderEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  contactStatus: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending'
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for retrieving messages in a conversation
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ type: 1, receiverId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);

