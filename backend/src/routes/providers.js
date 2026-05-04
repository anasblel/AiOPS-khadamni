import express from 'express';
import { protect } from '../middleware/protect.js';
import { getProviders, updateMyProfile, getMyProfile } from '../controllers/providerController.js';

const router = express.Router();

router.get('/', protect, getProviders);
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);

export default router;