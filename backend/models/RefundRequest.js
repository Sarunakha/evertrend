import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Refunded'],
    default: 'Pending',
    index: true
  },
  images: {
    type: [String],
    default: []
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
refundRequestSchema.index({ userId: 1, createdAt: -1 });
refundRequestSchema.index({ sellerId: 1, status: 1 });
refundRequestSchema.index({ orderId: 1, productId: 1 });
refundRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('RefundRequest', refundRequestSchema);
