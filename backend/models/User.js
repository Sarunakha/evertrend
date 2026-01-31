import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sizeProfileSchema = new mongoose.Schema({
  shoulder: { type: Number },
  chest: { type: Number },
  length: { type: Number }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not using Google OAuth
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values
    unique: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Seller', 'Buyer'],
    default: 'Buyer'
  },
  sizeProfile: {
    type: sizeProfileSchema,
    default: null
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationToken: String,
  verificationTokenExpire: Date,
  verificationOTP: {
    type: String,
    select: false
  },
  verificationOTPExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for performance
// Note: email and username already have indexes from 'unique: true'
// Only add index for role
userSchema.index({ role: 1 });

export default mongoose.model('User', userSchema);

