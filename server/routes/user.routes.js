import express from "express";
import { updateUsername, searchUser, sendFriendRequest, acceptFriendRequest, deleteFriendRequest, getFriendlist, getFriendRequests  } from "../controllers/user.controllers.js";
import { authenticateUser} from "../middlewares/authMiddleware.js"; // Import middleware

const router = express.Router();

router.get("/searchUser", searchUser);
router.post("/update-username", authenticateUser, updateUsername);
router.post("/send-friend-request", authenticateUser, sendFriendRequest);
router.post("/accept-friend-request", authenticateUser, acceptFriendRequest);
router.post("/delete-friend-request", authenticateUser, deleteFriendRequest);
router.get("/friendList", authenticateUser, getFriendlist);
router.get("/friendRequestList", authenticateUser, getFriendRequests);

export default router;
