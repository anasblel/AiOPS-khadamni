import express from 'express';
import { protect, adminProtect } from '../middleware/protect.js';
import {
  getUsers,
  deleteUser,
  createJobFamily,
  updateJobFamily,
  deleteJobFamily
} from '../controllers/adminController.js';

const router = express.Router();

// Apply admin checks to all routes in this router
router.use(protect, adminProtect);

// User Management Routes
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);

// Services (JobFamily) Management Routes
router.post('/job-families', createJobFamily);
router.put('/job-families/:id', updateJobFamily);
router.delete('/job-families/:id', deleteJobFamily);

export default router;
