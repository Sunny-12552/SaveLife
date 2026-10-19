import express from 'express';
import {
  registerDonor,
  getAllDonors,
  getDonorById,
  getMyDonorProfile,
  updateDonor,
  deleteDonor,
  checkDonorEligibility,
  searchDonorsByBloodGroup,
} from '../controllers/donorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { seedTestDonors, clearTestDonors } from '../utils/seedDonors.js';

const router = express.Router();

// Test data seeding routes (only in development)
if (process.env.NODE_ENV === 'development') {
  router.post('/seed-test-data', protect, authorize('admin'), async (req, res) => {
    try {
      const donors = await seedTestDonors();
      res.status(200).json({
        success: true,
        message: 'Test donors seeded successfully',
        data: donors,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  router.delete('/clear-test-data', protect, authorize('admin'), async (req, res) => {
    try {
      await clearTestDonors();
      res.status(200).json({
        success: true,
        message: 'Test donors cleared successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });
}

router.post('/register', protect, registerDonor);
router.get('/', protect, getAllDonors);
router.get('/me', protect, getMyDonorProfile);
router.get('/search/:bloodGroup', protect, searchDonorsByBloodGroup);
router.get('/:id', protect, getDonorById);
router.get('/:id/eligibility', protect, checkDonorEligibility);
router.patch('/:id', protect, updateDonor);
router.delete('/:id', protect, deleteDonor);

export default router;
