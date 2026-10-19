import express from 'express';
import { getLiveUpdates } from '../controllers/liveUpdatesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getLiveUpdates);

export default router;
