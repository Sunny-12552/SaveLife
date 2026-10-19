import express from 'express';
import {
  createCamp,
  getAllCamps,
  getCampById,
  getPublicCampById,
  updateCamp,
  deleteCamp,
  registerForCamp,
  markAttendance,
  getMyCamps,
  getUpcomingCamps,
} from '../controllers/campController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, authorize('admin', 'organizer'), createCamp);
router.get('/', protect, getAllCamps);
router.get('/upcoming', protect, getUpcomingCamps);
router.get('/my-camps', protect, getMyCamps);
router.get('/public/:id', getPublicCampById);
router.get('/:id', protect, getCampById);
router.patch('/:id', protect, authorize('admin', 'organizer'), updateCamp);
router.delete('/:id', protect, authorize('admin', 'organizer'), deleteCamp);
router.post('/:id/register', protect, registerForCamp);
router.patch('/:campId/attendance/:donorId', protect, authorize('admin', 'organizer'), markAttendance);

export default router;
