import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bloodGroup: {
      type: String,
      required: [true, 'Please provide blood group'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Please provide date of birth'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    address: {
      street: String,
      city: {
        type: String,
        required: [true, 'Please provide city'],
      },
      state: {
        type: String,
        required: [true, 'Please provide state'],
      },
      zipCode: String,
      country: {
        type: String,
        default: 'India',
      },
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
    isEligible: {
      type: Boolean,
      default: true,
    },
    healthInfo: {
      weight: {
        type: Number,
        required: [true, 'Please provide weight in kg'],
        min: [45, 'Weight must be at least 45kg to donate blood'],
      },
      height: {
        type: Number,
      },
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      hemoglobin: {
        type: Number,
        min: [12.5, 'Hemoglobin must be at least 12.5 g/dL'],
      },
      medicalConditions: [String],
      medications: [String],
      allergies: [String],
      lastCheckupDate: Date,
    },
    donationHistory: [
      {
        campId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Camp',
        },
        donationDate: {
          type: Date,
          required: true,
        },
        unitsCollected: {
          type: Number,
          default: 1,
        },
        notes: String,
      },
    ],
    totalDonations: {
      type: Number,
      default: 0,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

donorSchema.pre('save', function (next) {
  if (this.lastDonationDate) {
    const daysSinceLastDonation = Math.floor(
      (Date.now() - this.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    this.isEligible = daysSinceLastDonation >= 90;
  } else {
    this.isEligible = true;
  }
  next();
});

donorSchema.methods.checkEligibility = function () {
  if (!this.lastDonationDate) return true;
  
  const daysSinceLastDonation = Math.floor(
    (Date.now() - this.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceLastDonation >= 90;
};

const Donor = mongoose.model('Donor', donorSchema);

export default Donor;
