import express from 'express';
import { messageController, getChatHistory, getMessagePreviews } from '../controllers/message.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', messageController);
router.get('/history', authenticateUser, getChatHistory);
router.get('/previews', authenticateUser, getMessagePreviews); // Add this line

export default router;