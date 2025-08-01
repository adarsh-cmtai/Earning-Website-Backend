import { Router } from 'express';
import { getDashboardData } from '../../controllers/admin/dashboardController.js';

const router = Router();

router.route('/').get(getDashboardData);

export default router;