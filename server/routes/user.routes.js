import express from "express";
import { 
  updateUsername, 
  searchUser, 
  acceptFriendRequest, 
  deleteFriendRequest, 
  getFriendlist, 
  getFriendRequests,
  getUser,
  updateDescription,
  updateAvatar,
  getAvatar,
  unfriendUser
} from "../controllers/user.controllers.js";
import { authenticateUser } from "../middlewares/authMiddleware.js"; // Import middleware

const router = express.Router();

// User profile routes
router.post("/update-username", authenticateUser, updateUsername);
router.get("/get-user", authenticateUser, getUser);
router.put("/update-description", authenticateUser, updateDescription);
router.put("/update-avatar", authenticateUser, updateAvatar);
router.get("/get-avatar/:username", getAvatar); // Removed authentication as avatars may need to be public

// Friend management routes
router.get("/searchUser", searchUser);
router.post("/accept-friend-request", authenticateUser, acceptFriendRequest);
router.post("/delete-friend-request", authenticateUser, deleteFriendRequest);
router.get("/friendList", authenticateUser, getFriendlist);
router.get("/friendRequestList", authenticateUser, getFriendRequests);
router.post("/unfriend", authenticateUser, unfriendUser);

export default router;