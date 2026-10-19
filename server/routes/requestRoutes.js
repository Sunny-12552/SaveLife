import express from 'express';
import {
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  findMatchingDonors,
  matchDonorsToRequest,
  updateDonorResponse,
  getMyRequests,
  getUrgentRequests,
} from '../controllers/requestController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, authorize('admin', 'organizer', 'patient'), createRequest);
router.get('/', protect, getAllRequests);
router.get('/urgent', protect, getUrgentRequests);
router.get('/my-requests', protect, getMyRequests);
router.get('/match/:bloodGroup', protect, authorize('admin', 'organizer'), findMatchingDonors);
router.get('/:id', protect, getRequestById);
router.patch('/:id', protect, authorize('admin', 'organizer', 'patient'), updateRequest);
router.delete('/:id', protect, authorize('admin', 'organizer', 'patient'), deleteRequest);
router.post('/:id/match-donors', protect, authorize('admin', 'organizer'), matchDonorsToRequest);
router.patch('/:requestId/donor/:donorId', protect, authorize('admin', 'organizer'), updateDonorResponse);

export default router;
