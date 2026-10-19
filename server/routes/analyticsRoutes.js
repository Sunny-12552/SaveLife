import express from 'express';
import {
  getDashboardStats,
  getDonorAnalytics,
  getCampAnalytics,
  getRequestAnalytics,
  getDonationAnalytics,
  generateReport
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// Dashboard statistics - accessible to admins only
router.get('/dashboard', authorize('admin'), getDashboardStats);

// Detailed analytics - accessible to admins only
router.get('/donors', authorize('admin'), getDonorAnalytics);
router.get('/camps', authorize('admin'), getCampAnalytics);
router.get('/requests', authorize('admin'), getRequestAnalytics);
router.get('/donations', authorize('admin'), getDonationAnalytics);

// Report generation - accessible to admins only
router.get('/report', authorize('admin'), generateReport);

export default router;
