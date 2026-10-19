import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester is required'],
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    patientAge: {
      type: Number,
      required: [true, 'Patient age is required'],
      min: [0, 'Age must be positive'],
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsRequired: {
      type: Number,
      required: [true, 'Units required is mandatory'],
      min: [1, 'At least 1 unit required'],
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    requiredBy: {
      type: Date,
      required: [true, 'Required by date is mandatory'],
    },
    hospital: {
      name: {
        type: String,
        required: [true, 'Hospital name is required'],
      },
      address: String,
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      zipCode: String,
    },
    contactInfo: {
      phone: {
        type: String,
        required: [true, 'Contact phone is required'],
      },
      alternatePhone: String,
      email: String,
    },
    reason: {
      type: String,
      required: [true, 'Reason for blood requirement is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'],
      default: 'pending',
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    matchedDonors: [
      {
        donorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor',
        },
        matchedAt: {
          type: Date,
          default: Date.now,
        },
        contacted: {
          type: Boolean,
          default: false,
        },
        agreedToDonate: {
          type: Boolean,
          default: false,
        },
        donated: {
          type: Boolean,
          default: false,
        },
        unitsContributed: {
          type: Number,
          default: 0,
        },
      },
    ],
    unitsFulfilled: {
      type: Number,
      default: 0,
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

requestSchema.index({ bloodGroup: 1, 'hospital.city': 1, status: 1 });
requestSchema.index({ urgency: -1, createdAt: -1 });

requestSchema.methods.updateStatus = function () {
  if (this.unitsFulfilled >= this.unitsRequired) {
    this.status = 'fulfilled';
    if (!this.fulfilledAt) this.fulfilledAt = new Date();
  } else if (this.unitsFulfilled > 0) {
    this.status = 'partially_fulfilled';
  } else {
    const now = new Date();
    if (this.requiredBy < now) {
      this.status = 'expired';
    }
  }
};

requestSchema.methods.getRemainingUnits = function () {
  return this.unitsRequired - this.unitsFulfilled;
};

const Request = mongoose.model('Request', requestSchema);

export default Request;
