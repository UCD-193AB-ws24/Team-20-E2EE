import express from "express";
import { getInfo, updateDescription, updateAvatar, getUserFB, getAvatar, fetchUsers } from "../controllers/userInfo.controller.js";
import { upload } from "../mongo/connection.js";

const router = express.Router();

router.put("/updateUsername", updateDescription);
router.put("/updateDescription", updateDescription);
router.put("/updateAvatar", upload.single("avatar"), updateAvatar);
router.get("/getUserFB", getUserFB);
router.get("/getAvatar/:id", getAvatar);
router.get("/getInfo", getInfo);
router.get("/fetchUsers", fetchUsers);

export default router;
