import express from 'express';
import { getChatHistory, getMessagePreviews, sendPrivateMessage } from '../controllers/message.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateUser, sendPrivateMessage);
router.get('/history', authenticateUser, getChatHistory);
router.get('/previews', authenticateUser, getMessagePreviews);

export default router;