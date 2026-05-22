import express from 'express';
import { protect } from '../middleware/protect.js';
import { createBooking, getMyBookings, updateBookingStatus, deleteBooking, completeBooking } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/me', protect, getMyBookings);
router.patch('/:id/status', protect, updateBookingStatus);
router.patch('/:id/complete', protect, completeBooking);
router.delete('/:id', protect, deleteBooking);

export default router;