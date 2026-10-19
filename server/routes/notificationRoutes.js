import express from 'express';
import {
  sendSingleSMS,
  sendEmergencyNotificationToDonors,
  getEligibleDonorsForRequest,
  notifyAdminAboutCamp,
  getMyNotifications,
  getAllNotifications,
  getSMSStatus,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Send single SMS (Admin/Organizer only)
router.post('/sms', protect, authorize('admin', 'organizer'), sendSingleSMS);

// Emergency request notifications
router.post(
  '/emergency-donors',
  protect,
  authorize('admin', 'organizer'),
  sendEmergencyNotificationToDonors
);

router.get(
  '/eligible-donors/:requestId',
  protect,
  authorize('admin', 'organizer'),
  getEligibleDonorsForRequest
);

// Camp creation notification
router.post('/camp-created', protect, authorize('admin', 'organizer'), notifyAdminAboutCamp);

// Get notifications
router.get('/history', protect, getMyNotifications);
router.get('/', protect, authorize('admin'), getAllNotifications);

// Check SMS status
router.get('/status/:messageSid', protect, authorize('admin', 'organizer'), getSMSStatus);

export default router;
