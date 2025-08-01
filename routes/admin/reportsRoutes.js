import { Router } from 'express';
import { getReportsData, exportReport } from '../../controllers/admin/reportsController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageReports = checkRole(['SUPER_ADMIN']);

router.route('/').get(canManageReports, getReportsData);
router.route('/export').post(canManageReports, exportReport);

export default router;