import express from 'express';
import { register, login, refresh, getMe, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
export default router;