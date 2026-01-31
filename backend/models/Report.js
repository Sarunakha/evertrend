import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportType: {
    type: String,
    enum: ['Scam', 'Harassment', 'IP Theft', 'Inappropriate Content', 'Other'],
    required: true
  },
  targetType: {
    type: String,
    enum: ['User', 'Product', 'Order', 'Review'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Report description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Resolved', 'Dismissed'],
    default: 'Pending',
    index: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for performance
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportType: 1, status: 1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model('Report', reportSchema);

