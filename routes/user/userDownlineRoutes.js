import { Router } from 'express';
import { getDownlineData, uploadAnalyticsScreenshot, submitManualIncome } from '../../controllers/user/downlineController.js';
import { upload } from '../../middlewares/uploadMiddleware.js';

const router = Router();

router.route('/').get(getDownlineData);
router.route('/upload-analytics').post(upload.single('screenshot'), uploadAnalyticsScreenshot);
router.route('/submit-manual-income').post(upload.single('screenshot'), submitManualIncome);

export default router;