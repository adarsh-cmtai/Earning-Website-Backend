import { Router } from 'express';
import { getAiVideosData, markVideoAsDownloaded } from '../../controllers/user/userAiVideosController.js';

const router = Router();

router.route('/').get(getAiVideosData);
router.route('/mark-downloaded').post(markVideoAsDownloaded);

export default router;