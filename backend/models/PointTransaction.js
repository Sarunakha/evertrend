import mongoose from 'mongoose';

const pointTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  points: {
    type: Number,
    required: [true, 'Points amount is required']
  },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'adjusted'],
    required: [true, 'Transaction type is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  // Reference to related entity (order, coupon, etc.)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  referenceType: {
    type: String,
    enum: ['order', 'coupon', 'manual', null],
    default: null
  },
  balanceAfter: {
    type: Number,
    required: [true, 'Balance after transaction is required']
  }
}, {
  timestamps: true
});

// Indexes for performance
pointTransactionSchema.index({ userId: 1, createdAt: -1 });
pointTransactionSchema.index({ type: 1 });
pointTransactionSchema.index({ referenceId: 1, referenceType: 1 });

export default mongoose.model('PointTransaction', pointTransactionSchema);

