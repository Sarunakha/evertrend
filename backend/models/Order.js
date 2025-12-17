import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['eSewa', 'Cash on Delivery', 'Bank Transfer']
  },
  transactionId: {
    type: String,
    default: null
  },
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ userId: 1, orderDate: -1 });
orderSchema.index({ status: 1, orderDate: -1 });

export default mongoose.model('Order', orderSchema);

