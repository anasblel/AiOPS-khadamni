import express from 'express';
import { protect } from '../middleware/protect.js';
import { chat } from '../controllers/chatController.js';

const router = express.Router();

router.post('/', protect, chat);

export default router;