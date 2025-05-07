import express from 'express';
import { getChatHistory, getMessagePreviews, sendPrivateMessage, getChatArchive, deleteMessages, createGroup, getAllGroupChat } from '../controllers/message.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateUser, sendPrivateMessage);
router.get('/history', authenticateUser, getChatHistory);
router.get('/archive', authenticateUser, getChatArchive);
router.get('/previews', authenticateUser, getMessagePreviews);
router.post('/vanish', authenticateUser, deleteMessages);
router.post('/create-group', authenticateUser, createGroup);
router.get("/get-groups", authenticateUser, getAllGroupChat)


export default router;