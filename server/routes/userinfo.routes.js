import express from "express";
import { getInfo, updateDescription, updateAvatar, getAvatar } from "../controllers/userInfo.controllers.js";
import { upload } from "../mongo/connection.js";

const router = express.Router();

router.put("/updateUsername", updateDescription);
router.put("/updateDescription", updateDescription);
router.put("/updateAvatar", upload.single("avatar"), updateAvatar);
router.get("/getAvatar/:id", getAvatar);
router.get("/getInfo", getInfo);
router.get("/fetchUsers", fetchUsers);

export default router;
