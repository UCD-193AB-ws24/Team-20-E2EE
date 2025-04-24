import express from 'express';
import { getChatHistory, getMessagePreviews, sendPrivateMessage, getChatArchive, deleteMessages } from '../controllers/message.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateUser, sendPrivateMessage);
router.get('/history', authenticateUser, getChatHistory);
router.get('/archive', authenticateUser, getChatArchive);
router.get('/previews', authenticateUser, getMessagePreviews);
router.post('/vanish', authenticateUser, deleteMessages);


export default router;