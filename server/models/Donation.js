import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
    },
    campId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camp',
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
    },
    donationType: {
      type: String,
      enum: ['camp', 'direct', 'request'],
      default: 'camp',
    },
    donationDate: {
      type: Date,
      required: [true, 'Donation date is required'],
      default: Date.now,
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsCollected: {
      type: Number,
      required: [true, 'Units collected is required'],
      default: 1,
      min: [0.5, 'Units must be at least 0.5'],
      max: [2, 'Units cannot exceed 2'],
    },
    preCheckup: {
      weight: Number,
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      hemoglobin: Number,
      temperature: Number,
      pulse: Number,
      eligible: {
        type: Boolean,
        default: true,
      },
      notes: String,
    },
    postCheckup: {
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'concern'],
        default: 'good',
      },
      notes: String,
      complications: String,
    },
    location: {
      facility: String,
      city: String,
      state: String,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rejected'],
      default: 'scheduled',
    },
    certificate: {
      issued: {
        type: Boolean,
        default: false,
      },
      certificateNumber: String,
      issuedDate: Date,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ donorId: 1, donationDate: -1 });
donationSchema.index({ campId: 1 });
donationSchema.index({ status: 1 });

donationSchema.pre('save', async function (next) {
  if (this.isNew && this.status === 'completed' && this.donorId) {
    const Donor = mongoose.model('Donor');
    const donor = await Donor.findById(this.donorId);
    
    if (donor) {
      donor.lastDonationDate = this.donationDate;
      donor.totalDonations += 1;
      donor.donationHistory.push({
        campId: this.campId,
        donationDate: this.donationDate,
        unitsCollected: this.unitsCollected,
        notes: this.notes,
      });
      await donor.save();
    }
  }
  next();
});

const Donation = mongoose.model('Donation', donationSchema);

export default Donation;
