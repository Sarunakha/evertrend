import mongoose from 'mongoose';

const loyaltyPointsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: [0, 'Points cannot be negative']
  },
  lifetimePoints: {
    type: Number,
    default: 0,
    min: [0, 'Lifetime points cannot be negative']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Note: userId index is automatically created by unique: true, no need to create manually

// Method to add points
loyaltyPointsSchema.methods.addPoints = async function(points, reason = 'Purchase') {
  this.totalPoints += points;
  this.lifetimePoints += points;
  this.lastUpdated = new Date();
  await this.save();
  return this.totalPoints;
};

// Method to redeem points
loyaltyPointsSchema.methods.redeemPoints = async function(points) {
  if (this.totalPoints < points) {
    throw new Error('Insufficient points');
  }
  this.totalPoints -= points;
  this.lastUpdated = new Date();
  await this.save();
  return this.totalPoints;
};

export default mongoose.model('LoyaltyPoints', loyaltyPointsSchema);

