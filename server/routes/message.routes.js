import express from 'express';
import {messageController} from '../controllers/message.controllers.js';


const router = express.Router();

router.post('/send', messageController);

export default router;