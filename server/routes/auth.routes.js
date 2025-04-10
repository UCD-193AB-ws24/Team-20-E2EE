import express from 'express';
import {register, login, logout, refreshToken} from '../controllers/auth.controllers.js';

const router = express.Router();
router.post('/signup', register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);


export default router;