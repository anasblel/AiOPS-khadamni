import express from 'express';
import { protect } from '../middleware/protect.js';
import {
  getJobFamilies,
  getProviders,
  getProviderById,
  getMyProfile,
  updateMyProfile,
  updateAvailability,
} from '../controllers/providerController.js';

const router = express.Router();

router.get('/job-families', getJobFamilies);          // public — for dropdowns
router.get('/', protect, getProviders);
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/availability', protect, updateAvailability);
router.get('/:id', protect, getProviderById);         // single provider profile

export default router;