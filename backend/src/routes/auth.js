import express from 'express';
import { register, login, refresh, getMe, updateMe, getUserById, googleAuth } from '../controllers/authController.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.get('/users/:id', protect, getUserById);
export default router;