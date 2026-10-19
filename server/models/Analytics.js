import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  metrics: {
    totalDonations: {
      type: Number,
      default: 0
    },
    totalUnits: {
      type: Number,
      default: 0
    },
    totalDonors: {
      type: Number,
      default: 0
    },
    newDonors: {
      type: Number,
      default: 0
    },
    activeCamps: {
      type: Number,
      default: 0
    },
    completedCamps: {
      type: Number,
      default: 0
    },
    activeRequests: {
      type: Number,
      default: 0
    },
    fulfilledRequests: {
      type: Number,
      default: 0
    },
    // Blood group breakdown
    bloodGroupDistribution: {
      'A+': { type: Number, default: 0 },
      'A-': { type: Number, default: 0 },
      'B+': { type: Number, default: 0 },
      'B-': { type: Number, default: 0 },
      'AB+': { type: Number, default: 0 },
      'AB-': { type: Number, default: 0 },
      'O+': { type: Number, default: 0 },
      'O-': { type: Number, default: 0 }
    },
    // Location breakdown
    topCities: [{
      city: String,
      count: Number
    }],
    // Donation types
    donationTypes: {
      camp: { type: Number, default: 0 },
      direct: { type: Number, default: 0 },
      request: { type: Number, default: 0 }
    }
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
analyticsSchema.index({ type: 1, date: -1 });
analyticsSchema.index({ createdAt: -1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
