import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      unique: true,
    },
    unitsAvailable: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Units available cannot be negative'],
    },
    unitsReserved: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Units reserved cannot be negative'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    location: {
      type: String,
      default: 'Main Blood Bank',
    },
    isDemoData: {
      type: Boolean,
      default: false,
    },
    // Track individual blood units with expiry dates
    units: [
      {
        unitId: {
          type: String,
          required: true,
          unique: true,
        },
        donationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donation',
        },
        collectedDate: {
          type: Date,
          required: true,
        },
        expiryDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ['available', 'reserved', 'issued', 'expired', 'discarded'],
          default: 'available',
        },
        reservedFor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Request',
        },
      },
    ],
    // History of inventory changes
    history: [
      {
        action: {
          type: String,
          enum: ['added', 'issued', 'reserved', 'unreserved', 'expired', 'discarded'],
          required: true,
        },
        units: {
          type: Number,
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reason: String,
        relatedId: mongoose.Schema.Types.ObjectId, // Donation or Request ID
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
inventorySchema.index({ bloodGroup: 1 });
inventorySchema.index({ 'units.status': 1 });
inventorySchema.index({ 'units.expiryDate': 1 });

// Method to get total available units
inventorySchema.methods.getTotalAvailable = function () {
  return this.units.filter((unit) => unit.status === 'available').length;
};

// Method to get expiring units (within 7 days)
inventorySchema.methods.getExpiringSoon = function () {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return this.units.filter(
    (unit) =>
      unit.status === 'available' &&
      unit.expiryDate <= sevenDaysFromNow &&
      unit.expiryDate > new Date()
  );
};

// Method to get expired units
inventorySchema.methods.getExpired = function () {
  return this.units.filter(
    (unit) => unit.expiryDate <= new Date() && unit.status !== 'expired'
  );
};

// Method to reserve units for a request
inventorySchema.methods.reserveUnits = async function (quantity, requestId, userId) {
  const availableUnits = this.units
    .filter((unit) => unit.status === 'available' && unit.expiryDate > new Date())
    .sort((a, b) => a.expiryDate - b.expiryDate) // Use oldest first (FIFO)
    .slice(0, quantity);

  if (availableUnits.length < quantity) {
    throw new Error(
      `Insufficient units available. Requested: ${quantity}, Available: ${availableUnits.length}`
    );
  }

  // Update unit statuses
  availableUnits.forEach((unit) => {
    unit.status = 'reserved';
    unit.reservedFor = requestId;
  });

  this.unitsReserved += quantity;
  this.unitsAvailable -= quantity;

  // Add to history
  this.history.push({
    action: 'reserved',
    units: quantity,
    performedBy: userId,
    relatedId: requestId,
    reason: `Reserved for request ${requestId}`,
  });

  this.lastUpdated = new Date();
  return this.save();
};

// Method to issue units (convert from reserved to issued)
inventorySchema.methods.issueUnits = async function (quantity, requestId, userId) {
  const reservedUnits = this.units
    .filter((unit) => unit.status === 'reserved' && unit.reservedFor?.toString() === requestId.toString())
    .slice(0, quantity);

  if (reservedUnits.length < quantity) {
    throw new Error(
      `Insufficient reserved units. Requested: ${quantity}, Available: ${reservedUnits.length}`
    );
  }

  // Update unit statuses
  reservedUnits.forEach((unit) => {
    unit.status = 'issued';
  });

  this.unitsReserved -= quantity;

  // Add to history
  this.history.push({
    action: 'issued',
    units: quantity,
    performedBy: userId,
    relatedId: requestId,
    reason: `Issued for request ${requestId}`,
  });

  this.lastUpdated = new Date();
  return this.save();
};

// Method to unreserve units (return to available)
inventorySchema.methods.unreserveUnits = async function (requestId, userId) {
  const reservedUnits = this.units.filter(
    (unit) => unit.status === 'reserved' && unit.reservedFor?.toString() === requestId.toString()
  );

  const quantity = reservedUnits.length;

  if (quantity === 0) {
    return this;
  }

  // Update unit statuses
  reservedUnits.forEach((unit) => {
    unit.status = 'available';
    unit.reservedFor = undefined;
  });

  this.unitsReserved -= quantity;
  this.unitsAvailable += quantity;

  // Add to history
  this.history.push({
    action: 'unreserved',
    units: quantity,
    performedBy: userId,
    relatedId: requestId,
    reason: `Unreserved from request ${requestId}`,
  });

  this.lastUpdated = new Date();
  return this.save();
};

// Method to mark expired units
inventorySchema.methods.markExpired = async function (userId) {
  const expiredUnits = this.getExpired();
  const quantity = expiredUnits.length;

  if (quantity === 0) {
    return { expired: 0 };
  }

  expiredUnits.forEach((unit) => {
    const wasAvailable = unit.status === 'available';
    unit.status = 'expired';

    if (wasAvailable) {
      this.unitsAvailable -= 1;
    } else if (unit.status === 'reserved') {
      this.unitsReserved -= 1;
    }
  });

  // Add to history
  this.history.push({
    action: 'expired',
    units: quantity,
    performedBy: userId,
    reason: 'Automatic expiry check',
  });

  this.lastUpdated = new Date();
  await this.save();

  return { expired: quantity };
};

// Static method to add units from a donation
inventorySchema.statics.addFromDonation = async function (donation, userId) {
  const { bloodGroup, unitsCollected, _id: donationId, donationDate } = donation;

  let inventory = await this.findOne({ bloodGroup });

  if (!inventory) {
    inventory = await this.create({
      bloodGroup,
      unitsAvailable: 0,
      unitsReserved: 0,
      units: [],
      history: [],
    });
  }

  // Blood typically expires 35-42 days after collection. Using 35 days.
  const expiryDate = new Date(donationDate);
  expiryDate.setDate(expiryDate.getDate() + 35);

  // Add units
  for (let i = 0; i < unitsCollected; i++) {
    const unitId = `${bloodGroup}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    inventory.units.push({
      unitId,
      donationId,
      collectedDate: donationDate,
      expiryDate,
      status: 'available',
    });
  }

  inventory.unitsAvailable += unitsCollected;

  // Add to history
  inventory.history.push({
    action: 'added',
    units: unitsCollected,
    performedBy: userId,
    relatedId: donationId,
    reason: `Added from donation ${donationId}`,
  });

  inventory.lastUpdated = new Date();
  await inventory.save();

  return inventory;
};

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;
