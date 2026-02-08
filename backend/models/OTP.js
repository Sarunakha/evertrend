import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    index: true // Index for faster lookups
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: [6, 'OTP must be 6 digits']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // TTL: documents will be deleted after 300 seconds (5 minutes)
    // Note: expires option automatically creates TTL index, no need to create manually
  }
}, {
  timestamps: false // We only use createdAt for TTL
});

// Note: TTL index is automatically created by expires option above

// Compound index for faster email + OTP lookups
otpSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model('OTP', otpSchema);

