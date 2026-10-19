import asyncHandler from 'express-async-handler';
import Inventory from '../models/Inventory.js';
import Donation from '../models/Donation.js';
import Request from '../models/Request.js';

// @desc    Get all inventory (all blood groups)
// @route   GET /api/inventory
// @access  Private (Admin, Organizer)
export const getAllInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.find({})
    .sort({ bloodGroup: 1 })
    .select('-units.donationId'); // Don't send detailed unit info for overview

  // Calculate summary
  const summary = {
    totalAvailable: 0,
    totalReserved: 0,
    totalExpiringSoon: 0,
    totalExpired: 0,
  };

  const inventoryWithStats = inventory.map((item) => {
    const expiringSoon = item.getExpiringSoon().length;
    const expired = item.getExpired().length;

    summary.totalAvailable += item.unitsAvailable;
    summary.totalReserved += item.unitsReserved;
    summary.totalExpiringSoon += expiringSoon;
    summary.totalExpired += expired;

    return {
      bloodGroup: item.bloodGroup,
      unitsAvailable: item.unitsAvailable,
      unitsReserved: item.unitsReserved,
      expiringSoon,
      expired,
      location: item.location,
      isDemoData: item.isDemoData,
      lastUpdated: item.lastUpdated,
    };
  });

  res.json({
    success: true,
    data: {
      inventory: inventoryWithStats,
      summary,
    },
  });
});

// @desc    Get inventory for specific blood group
// @route   GET /api/inventory/:bloodGroup
// @access  Private (Admin, Organizer)
export const getInventoryByBloodGroup = asyncHandler(async (req, res) => {
  const { bloodGroup } = req.params;

  const inventory = await Inventory.findOne({ bloodGroup }).populate({
    path: 'units.donationId',
    select: 'donorId donationDate donationType',
  });

  if (!inventory) {
    // Return empty inventory if not found
    return res.json({
      success: true,
      data: {
        bloodGroup,
        unitsAvailable: 0,
        unitsReserved: 0,
        units: [],
        expiringSoon: [],
        expired: [],
        history: [],
      },
    });
  }

  const expiringSoon = inventory.getExpiringSoon();
  const expired = inventory.getExpired();

  res.json({
    success: true,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
      location: inventory.location,
      isDemoData: inventory.isDemoData,
      lastUpdated: inventory.lastUpdated,
      units: inventory.units,
      expiringSoon,
      expired,
      history: inventory.history.slice(-20), // Last 20 history entries
    },
  });
});

// @desc    Manually add units to inventory
// @route   POST /api/inventory/add
// @access  Private (Admin, Organizer)
export const addUnitsManually = asyncHandler(async (req, res) => {
  const { bloodGroup, units, collectedDate, reason } = req.body;

  // Validation
  if (!bloodGroup || !units || units <= 0) {
    res.status(400);
    throw new Error('Blood group and valid units count required');
  }

  let inventory = await Inventory.findOne({ bloodGroup });

  if (!inventory) {
    inventory = await Inventory.create({
      bloodGroup,
      unitsAvailable: 0,
      unitsReserved: 0,
      units: [],
      history: [],
    });
  }

  const collectionDate = collectedDate ? new Date(collectedDate) : new Date();
  const expiryDate = new Date(collectionDate);
  expiryDate.setDate(expiryDate.getDate() + 35); // 35 days shelf life

  // Add units
  for (let i = 0; i < units; i++) {
    const unitId = `${bloodGroup}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    inventory.units.push({
      unitId,
      collectedDate: collectionDate,
      expiryDate,
      status: 'available',
    });
  }

  inventory.unitsAvailable += units;

  // Add to history
  inventory.history.push({
    action: 'added',
    units,
    performedBy: req.user._id,
    reason: reason || 'Manual addition',
  });

  inventory.lastUpdated = new Date();
  await inventory.save();

  res.status(201).json({
    success: true,
    message: `${units} unit(s) of ${bloodGroup} added successfully`,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
    },
  });
});

// @desc    Reserve units for a blood request
// @route   POST /api/inventory/reserve
// @access  Private (Admin, Organizer)
export const reserveUnits = asyncHandler(async (req, res) => {
  const { bloodGroup, units, requestId } = req.body;

  // Validation
  if (!bloodGroup || !units || units <= 0 || !requestId) {
    res.status(400);
    throw new Error('Blood group, units, and request ID required');
  }

  // Verify request exists
  const request = await Request.findById(requestId);
  if (!request) {
    res.status(404);
    throw new Error('Blood request not found');
  }

  const inventory = await Inventory.findOne({ bloodGroup });

  if (!inventory) {
    res.status(404);
    throw new Error(`No inventory found for blood group ${bloodGroup}`);
  }

  // Reserve units
  await inventory.reserveUnits(units, requestId, req.user._id);

  res.json({
    success: true,
    message: `${units} unit(s) of ${bloodGroup} reserved successfully`,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
    },
  });
});

// @desc    Issue reserved units
// @route   POST /api/inventory/issue
// @access  Private (Admin, Organizer)
export const issueUnits = asyncHandler(async (req, res) => {
  const { bloodGroup, units, requestId } = req.body;

  // Validation
  if (!bloodGroup || !units || units <= 0 || !requestId) {
    res.status(400);
    throw new Error('Blood group, units, and request ID required');
  }

  const inventory = await Inventory.findOne({ bloodGroup });

  if (!inventory) {
    res.status(404);
    throw new Error(`No inventory found for blood group ${bloodGroup}`);
  }

  // Issue units
  await inventory.issueUnits(units, requestId, req.user._id);

  res.json({
    success: true,
    message: `${units} unit(s) of ${bloodGroup} issued successfully`,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
    },
  });
});

// @desc    Unreserve units (cancel reservation)
// @route   POST /api/inventory/unreserve
// @access  Private (Admin, Organizer)
export const unreserveUnits = asyncHandler(async (req, res) => {
  const { bloodGroup, requestId } = req.body;

  // Validation
  if (!bloodGroup || !requestId) {
    res.status(400);
    throw new Error('Blood group and request ID required');
  }

  const inventory = await Inventory.findOne({ bloodGroup });

  if (!inventory) {
    res.status(404);
    throw new Error(`No inventory found for blood group ${bloodGroup}`);
  }

  // Unreserve units
  await inventory.unreserveUnits(requestId, req.user._id);

  res.json({
    success: true,
    message: `Units of ${bloodGroup} unreserved successfully`,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
    },
  });
});

// @desc    Mark expired units and remove from available
// @route   POST /api/inventory/mark-expired/:bloodGroup
// @access  Private (Admin, Organizer)
export const markExpiredUnits = asyncHandler(async (req, res) => {
  const { bloodGroup } = req.params;

  const inventory = await Inventory.findOne({ bloodGroup });

  if (!inventory) {
    res.status(404);
    throw new Error(`No inventory found for blood group ${bloodGroup}`);
  }

  const result = await inventory.markExpired(req.user._id);

  res.json({
    success: true,
    message: `${result.expired} expired unit(s) marked`,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
      expiredUnits: result.expired,
    },
  });
});

// @desc    Run expiry check on all blood groups
// @route   POST /api/inventory/check-expiry
// @access  Private (Admin, Organizer)
export const checkAllExpiry = asyncHandler(async (req, res) => {
  const allInventory = await Inventory.find({});

  const results = [];

  for (const inventory of allInventory) {
    const result = await inventory.markExpired(req.user._id);
    if (result.expired > 0) {
      results.push({
        bloodGroup: inventory.bloodGroup,
        expiredUnits: result.expired,
      });
    }
  }

  const totalExpired = results.reduce((sum, r) => sum + r.expiredUnits, 0);

  res.json({
    success: true,
    message: `Expiry check complete. ${totalExpired} total unit(s) expired`,
    data: {
      results,
      totalExpired,
    },
  });
});

// @desc    Get inventory statistics
// @route   GET /api/inventory/stats
// @access  Private (Admin, Organizer)
export const getInventoryStats = asyncHandler(async (req, res) => {
  const allInventory = await Inventory.find({});

  const stats = {
    totalAvailable: 0,
    totalReserved: 0,
    totalIssued: 0,
    totalExpired: 0,
    expiringSoon: 0,
    byBloodGroup: {},
  };

  for (const inventory of allInventory) {
    stats.totalAvailable += inventory.unitsAvailable;
    stats.totalReserved += inventory.unitsReserved;

    const issued = inventory.units.filter((u) => u.status === 'issued').length;
    const expired = inventory.units.filter((u) => u.status === 'expired').length;
    const expiringSoon = inventory.getExpiringSoon().length;

    stats.totalIssued += issued;
    stats.totalExpired += expired;
    stats.expiringSoon += expiringSoon;

    stats.byBloodGroup[inventory.bloodGroup] = {
      available: inventory.unitsAvailable,
      reserved: inventory.unitsReserved,
      issued,
      expired,
      expiringSoon,
    };
  }

  res.json({
    success: true,
    data: stats,
  });
});

// @desc    Get inventory history
// @route   GET /api/inventory/history/:bloodGroup
// @access  Private (Admin, Organizer)
export const getInventoryHistory = asyncHandler(async (req, res) => {
  const { bloodGroup } = req.params;
  const { limit = 50 } = req.query;

  const inventory = await Inventory.findOne({ bloodGroup }).populate(
    'history.performedBy',
    'name email'
  );

  if (!inventory) {
    res.status(404);
    throw new Error(`No inventory found for blood group ${bloodGroup}`);
  }

  const history = inventory.history
    .slice(-parseInt(limit))
    .reverse()
    .map((entry) => ({
      action: entry.action,
      units: entry.units,
      performedBy: entry.performedBy,
      reason: entry.reason,
      timestamp: entry.timestamp,
    }));

  res.json({
    success: true,
    data: {
      bloodGroup,
      history,
    },
  });
});

// @desc    Discard damaged/unusable units
// @route   POST /api/inventory/discard
// @access  Private (Admin, Organizer)
export const discardUnits = asyncHandler(async (req, res) => {
  const { bloodGroup, unitIds, reason } = req.body;

  if (!bloodGroup || !unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
    res.status(400);
    throw new Error('Blood group and unit IDs array required');
  }

  const inventory = await Inventory.findOne({ bloodGroup });

  if (!inventory) {
    res.status(404);
    throw new Error(`No inventory found for blood group ${bloodGroup}`);
  }

  let discardedCount = 0;

  unitIds.forEach((unitId) => {
    const unit = inventory.units.find((u) => u.unitId === unitId);
    if (unit && unit.status !== 'issued') {
      const wasAvailable = unit.status === 'available';
      const wasReserved = unit.status === 'reserved';

      unit.status = 'discarded';

      if (wasAvailable) {
        inventory.unitsAvailable -= 1;
      } else if (wasReserved) {
        inventory.unitsReserved -= 1;
      }

      discardedCount++;
    }
  });

  if (discardedCount > 0) {
    inventory.history.push({
      action: 'discarded',
      units: discardedCount,
      performedBy: req.user._id,
      reason: reason || 'Units discarded',
    });

    inventory.lastUpdated = new Date();
    await inventory.save();
  }

  res.json({
    success: true,
    message: `${discardedCount} unit(s) discarded`,
    data: {
      bloodGroup: inventory.bloodGroup,
      unitsAvailable: inventory.unitsAvailable,
      unitsReserved: inventory.unitsReserved,
    },
  });
});
