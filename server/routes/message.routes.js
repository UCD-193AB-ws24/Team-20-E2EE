import express from 'express';
import { getChatHistory, getMessagePreviews, sendPrivateMessage, getChatArchive, deleteMessages, createGroup, sendGroupMessage, getGroupMessages, getAllGroupChat, addMemberToGroup, removeMemberFromGroup, updateGroupName } from '../controllers/message.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateUser, sendPrivateMessage);
router.get('/history', authenticateUser, getChatHistory);
router.get('/archive', authenticateUser, getChatArchive);
router.get('/previews', authenticateUser, getMessagePreviews);
router.post('/vanish', authenticateUser, deleteMessages);


// Group chat routes
router.post('/create-group', authenticateUser, createGroup);
router.post('/send-group', authenticateUser, sendGroupMessage);
router.get('/get-group-history', authenticateUser, getGroupMessages);
router.get("/get-groups", authenticateUser, getAllGroupChat)
router.post("/add-member-to-group", authenticateUser, addMemberToGroup);
router.post("/remove-member-from-group", authenticateUser, removeMemberFromGroup);
router.post("/update-group-name", authenticateUser, updateGroupName);

export default router;