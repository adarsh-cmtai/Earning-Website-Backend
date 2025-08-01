import { Router } from 'express';
import { getDashboardData } from '../../controllers/user/userDashboardController.js';

const router = Router();

router.route('/').get(getDashboardData);

export default router;