import express from 'express';
import { storeKeyBundle, getKeyBundle, deleteKeyBundle } from '../controllers/keyBundle.controllers.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Authentication required for these routes
router.post('/store', authenticateUser, storeKeyBundle);
router.delete('/delete', authenticateUser, deleteKeyBundle);

// Public route to get another user's key bundle
router.get('/:username', authenticateUser, getKeyBundle);

export default router;