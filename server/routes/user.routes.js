import express from "express";
import { updateUsername } from "../controllers/user.controllers.js";
import { authenticateUser } from "../middlewares/authMiddleware.js"; // Import middleware

const router = express.Router();

router.post("/update-username", authenticateUser, updateUsername);

export default router;
