import express from 'express';
import { getInfo, updateDescription, updateAvatar} from '../controllers/userInfo.controllers.js';

const router = express.Router();

router.put("/updateDescription", updateDescription);
router.put("/updateAvatar", updateAvatar);
router.get('/getInfo', getInfo);
router.get('/fetchUsers', fetchUsers);

export default router;