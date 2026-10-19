import express from 'express';
import {
  recordQuickDonation,
  getAllDonations,
  issueDonationCertificate,
  getMyCertificates,
} from '../controllers/donationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/quick', protect, authorize('admin', 'organizer'), recordQuickDonation);
router.get('/my-certificates', protect, authorize('donor'), getMyCertificates);
router.post('/:id/certificate', protect, authorize('admin', 'organizer'), issueDonationCertificate);
router.get('/', protect, getAllDonations);

export default router;
