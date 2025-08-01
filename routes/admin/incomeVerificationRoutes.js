import { Router } from 'express';
import { getManualIncomeSubmissions, reviewManualIncome } from '../../controllers/admin/userManagementController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageFinance = checkRole(['SUPER_ADMIN', 'FINANCE']);

router.route('/submissions').get(canManageFinance, getManualIncomeSubmissions);
router.route('/submissions/:submissionId/review').post(canManageFinance, reviewManualIncome);

export default router;