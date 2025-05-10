import express from "express";
import { storeKeyBundle, getKeyBundle, deleteKeyBundle, checkKeyBundle, checkDeviceKeyConsistency } from "../controllers/keyBundle.controllers.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/check", authenticateUser, checkKeyBundle);
router.get("/device-check", authenticateUser, checkDeviceKeyConsistency);
router.post("/store", authenticateUser, storeKeyBundle);
router.get("/:username", authenticateUser, getKeyBundle);
router.delete("/", authenticateUser, deleteKeyBundle);


export default router;