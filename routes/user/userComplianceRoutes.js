import { Router } from 'express';
import { getComplianceHistory } from '../../controllers/user/complianceController.js';

const router = Router();

router.route('/').get(getComplianceHistory);

export default router;