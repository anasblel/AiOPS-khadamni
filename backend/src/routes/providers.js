import express from 'express';
import { protect } from '../middleware/protect.js';
import {
  getJobFamilies,
  getProviders,
  getProviderById,
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  uploadCv,
  uploadCvMiddleware,
  suggestAndCreateJobFamily,
} from '../controllers/providerController.js';

const router = express.Router();

router.get('/job-families', getJobFamilies);          // public — for dropdowns
router.get('/', protect, getProviders);
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/availability', protect, updateAvailability);
router.post('/me/cv', protect, uploadCvMiddleware, uploadCv);
router.post('/job-families/suggest', protect, suggestAndCreateJobFamily);
router.get('/:id', protect, getProviderById);         // single provider profile

export default router;