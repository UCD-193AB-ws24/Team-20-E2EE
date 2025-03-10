import express from 'express';
import {register, login, logout} from '../controllers/auth.controllers.js';

const router = express.Router();
router.post('/signup', register);
router.post("/login", login);
router.post("/logout", logout);


export default router;