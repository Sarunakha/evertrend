import mongoose from 'mongoose';

const contactSubmissionSchema = new mongoose.Schema({
  senderName: {
    type: String,
    required: [true, 'Sender name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  senderEmail: {
    type: String,
    required: [true, 'Sender email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

contactSubmissionSchema.index({ receiverId: 1, createdAt: -1 });

export default mongoose.model('ContactSubmission', contactSubmissionSchema);
