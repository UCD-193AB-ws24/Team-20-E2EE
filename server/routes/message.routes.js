import express from 'express';
import { getChatHistory, getMessagePreviews, sendPrivateMessage, getBlurStatus, toggleBlurStatus, getBlurStatus, createGroup, getGroupMessages, getAllGroupChat, addMemberToGroup, removeMemberFromGroup, updateGroupName, getBlurStatus, toggleBlurStatus } from '../controllers/message.controllers.js';

import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateUser, sendPrivateMessage);
router.get('/history', authenticateUser, getChatHistory);
router.get('/previews', authenticateUser, getMessagePreviews);
router.get('/blurStatus', authenticateUser, getBlurStatus);
router.post('/toggleBlur', authenticateUser, toggleBlurStatus);
router.get('/userBlur', authenticateUser, getBlurStatus);




// Group chat routes
router.post('/create-group', authenticateUser, createGroup);
router.get('/get-group-history', authenticateUser, getGroupMessages);
router.get("/get-groups", authenticateUser, getAllGroupChat)
router.post("/add-member-to-group", authenticateUser, addMemberToGroup);
router.post("/remove-member-from-group", authenticateUser, removeMemberFromGroup);
router.post("/update-group-name", authenticateUser, updateGroupName);

export default router;