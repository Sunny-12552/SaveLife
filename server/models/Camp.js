import mongoose from 'mongoose';

const campSchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required'],
    },
    name: {
      type: String,
      required: [true, 'Camp name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    date: {
      type: Date,
      required: [true, 'Camp date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
    location: {
      venueName: {
        type: String,
        required: [true, 'Venue name is required'],
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      zipCode: String,
      landmark: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    registeredDonors: [
      {
        donorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor',
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        attended: {
          type: Boolean,
          default: false,
        },
        donated: {
          type: Boolean,
          default: false,
        },
        unitsCollected: {
          type: Number,
          default: 0,
        },
        donationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donation',
        },
      },
    ],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    totalUnitsCollected: {
      type: Number,
      default: 0,
    },
    requirements: {
      bloodGroups: [
        {
          type: String,
          enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        },
      ],
      targetUnits: Number,
    },
    contactInfo: {
      phone: {
        type: String,
        required: [true, 'Contact phone is required'],
      },
      email: String,
      coordinatorName: String,
    },
    campImage: {
      type: String,
      default: '',
    },
    images: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

campSchema.index({ date: 1, 'location.city': 1 });
campSchema.index({ status: 1 });

campSchema.methods.getAvailableSlots = function () {
  return this.capacity - this.registeredDonors.length;
};

campSchema.methods.isRegistrationOpen = function () {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const campDate = new Date(this.date);
  campDate.setUTCHours(0, 0, 0, 0);
  return (
    this.status === 'upcoming' &&
    this.getAvailableSlots() > 0 &&
    campDate >= today
  );
};

const Camp = mongoose.model('Camp', campSchema);

export default Camp;
