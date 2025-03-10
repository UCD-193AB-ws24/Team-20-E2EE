import express from 'express';
import { messageController, getChatHistory } from '../controllers/message.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', messageController);
router.get('/history', authenticateUser, getChatHistory);

export default router;