import { Router } from 'express';
import { getAuditLogs, getErrorLogs } from '../../controllers/admin/securityController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageSecurity = checkRole(['SUPER_ADMIN']);

router.route('/audit-logs').get(canManageSecurity, getAuditLogs);
router.route('/error-logs').get(canManageSecurity, getErrorLogs);

export default router;