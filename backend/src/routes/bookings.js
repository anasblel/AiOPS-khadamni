import express from 'express';
import { protect } from '../middleware/protect.js';
import { createBooking, getMyBookings, updateBookingStatus } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/me', protect, getMyBookings);
router.patch('/:id/status', protect, updateBookingStatus);

export default router;