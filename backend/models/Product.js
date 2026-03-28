import mongoose from 'mongoose';

const sizeChartEntrySchema = new mongoose.Schema({
  chest: { type: Number },
  waist: { type: Number },
  shoulder: { type: Number },
  hips: { type: Number },
  shoulderWidth: { type: Number }
}, { _id: false });

const sizeChartSchema = new mongoose.Schema({
  S: { type: sizeChartEntrySchema, default: null },
  M: { type: sizeChartEntrySchema, default: null },
  L: { type: sizeChartEntrySchema, default: null },
  XL: { type: sizeChartEntrySchema, default: null }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories', 'Shoes'],
    index: true
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'],
    index: true
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
    index: true
  },
  images: {
    type: [String],
    default: []
  },
  // Transparent PNG used for virtual try-on overlay
  vtoImage: {
    type: String,
    default: null
  },
  // Size chart used for fit recommendation (values should be consistent with user's bodyMeasurements units)
  sizeChart: {
    type: sizeChartSchema,
    default: null
  },
  stockQuantity: {
    type: Number,
    required: true,
    min: [0, 'Stock quantity cannot be negative'],
    default: 1
  },
  isSold: {
    type: Boolean,
    default: false,
    index: true
  },
  dimensions: {
    shoulder: { type: Number },
    chest: { type: Number },
    length: { type: Number }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0,
    index: true
  },
  flaggedForReview: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
productSchema.index({ sellerId: 1, isSold: 1 });
productSchema.index({ category: 1, isSold: 1 });
productSchema.index({ price: 1, isSold: 1 });
productSchema.index({ createdAt: -1 });

// Text index for search
productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);

