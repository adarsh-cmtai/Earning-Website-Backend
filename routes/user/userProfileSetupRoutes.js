import { Router } from 'express';
import { saveTopic, saveChannelName } from '../../controllers/user/userProfileSetupController.js';

const router = Router();

router.route('/topic').post(saveTopic);
router.route('/channel-name').post(saveChannelName);

export default router;