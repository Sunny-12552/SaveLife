import express from 'express';
import {
  getAllInventory,
  getInventoryByBloodGroup,
  addUnitsManually,
  reserveUnits,
  issueUnits,
  unreserveUnits,
  markExpiredUnits,
  checkAllExpiry,
  getInventoryStats,
  getInventoryHistory,
  discardUnits,
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All inventory routes require authentication and organizer/admin role
router.use(protect);
router.use(authorize('admin', 'organizer'));

// Get all inventory overview
router.get('/', getAllInventory);

// Get inventory statistics
router.get('/stats', getInventoryStats);

// Run expiry check on all blood groups
router.post('/check-expiry', checkAllExpiry);

// Get specific blood group inventory
router.get('/:bloodGroup', getInventoryByBloodGroup);

// Get inventory history for a blood group
router.get('/history/:bloodGroup', getInventoryHistory);

// Manually add units
router.post('/add', addUnitsManually);

// Reserve units for a request
router.post('/reserve', reserveUnits);

// Issue reserved units
router.post('/issue', issueUnits);

// Unreserve units (cancel reservation)
router.post('/unreserve', unreserveUnits);

// Mark expired units for a blood group
router.post('/mark-expired/:bloodGroup', markExpiredUnits);

// Discard damaged/unusable units
router.post('/discard', discardUnits);

export default router;
