import express from "express";
import { storeKeyBundle, getKeyBundle, deleteKeyBundle, checkKeyBundle, checkDeviceKeyConsistency, getUserKeyBundles } from "../controllers/keyBundle.controllers.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/check", authenticateUser, checkKeyBundle);
router.get("/device-check", authenticateUser, checkDeviceKeyConsistency);
router.post("/store", authenticateUser, storeKeyBundle);
router.get("/:username", authenticateUser, getKeyBundle); // Single device (legacy)
router.get("/:username/all-devices", authenticateUser, getUserKeyBundles); // Multi-device
router.delete("/", authenticateUser, deleteKeyBundle);


export default router;