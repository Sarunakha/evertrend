import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Coupon type is required']
  },
  value: {
    type: Number,
    required: [true, 'Coupon value is required'],
    min: [0, 'Coupon value cannot be negative']
  },
  // For percentage: value is the percentage (e.g., 10 = 10% off)
  // For fixed: value is the amount in rupees (e.g., 500 = Rs.500 off)
  description: {
    type: String,
    trim: true
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum purchase amount cannot be negative']
  },
  maxDiscountAmount: {
    type: Number,
    default: null, // null means no limit
    min: [0, 'Max discount amount cannot be negative']
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  usageLimit: {
    type: Number,
    default: null, // null means unlimited
    validate: {
      validator: function(value) {
        // Allow null or values >= 1
        return value === null || value >= 1;
      },
      message: 'Usage limit must be at least 1 or null for unlimited'
    }
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For seller-specific coupons
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null means platform-wide coupon
  },
  // For user-specific coupons (redeemed from points)
  redeemedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pointsCost: {
    type: Number,
    default: 0, // Points required to redeem this coupon
    min: [0, 'Points cost cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes for performance
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validUntil: 1 });
couponSchema.index({ sellerId: 1 });
couponSchema.index({ createdBy: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function(orderAmount) {
  if (!this.isValid() || orderAmount < this.minPurchaseAmount) {
    return 0;
  }

  let discount = 0;
  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    if (this.maxDiscountAmount !== null && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else if (this.type === 'fixed') {
    discount = this.value;
    if (discount > orderAmount) {
      discount = orderAmount; // Can't discount more than order amount
    }
  }

  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

// Method to use coupon
couponSchema.methods.useCoupon = async function() {
  if (!this.isValid()) {
    throw new Error('Coupon is not valid');
  }
  this.usedCount += 1;
  await this.save();
};

export default mongoose.model('Coupon', couponSchema);

