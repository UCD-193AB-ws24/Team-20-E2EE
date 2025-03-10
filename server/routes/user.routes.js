import express from "express";
import { updateUsername, getUser, updateDescription, updateAvatar, getAvatar } from "../controllers/user.controllers.js";
import { authenticateUser } from "../middlewares/authMiddleware.js"; // Import middleware

const router = express.Router();

router.post("/update-username", authenticateUser, updateUsername);
router.get("/get-user", authenticateUser, getUser);
router.put("/update-description", authenticateUser, updateDescription);
router.put("/update-avatar", authenticateUser, updateAvatar);
router.get("/get-avatar/:username", authenticateUser, getAvatar);


export default router;
