import express from 'express';
import {
  register,
  login,
  getProfile,
  getUsers,
  updateManagedUser,
  updateProfileImage,
  requestPasswordHelp,
  getPasswordHelpRequests,
  issuePasswordResetLink,
  resetPassword,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/password-help', requestPasswordHelp);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.patch('/profile/avatar', protect, updateProfileImage);
router.get('/users', protect, authorize('admin'), getUsers);
router.patch('/users/:id', protect, authorize('admin'), updateManagedUser);
router.get('/password-help', protect, authorize('admin'), getPasswordHelpRequests);
router.post('/password-help/:id/reset-link', protect, authorize('admin'), issuePasswordResetLink);

export default router;
