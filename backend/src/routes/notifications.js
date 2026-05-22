import express from 'express';
import { protect } from '../middleware/protect.js';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/me', protect, getMyNotifications);
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);

export default router;
