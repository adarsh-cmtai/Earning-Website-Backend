import { Router } from 'express';
import { createAlert, resolveAlert, sendUserAlert } from '../../controllers/admin/alertController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageSystem = checkRole(['SUPER_ADMIN']);
const canManageUsers = checkRole(['SUPER_ADMIN', 'USER_MANAGER', 'FINANCE']);

router.route('/').post(canManageSystem, createAlert);
router.route('/:alertId/resolve').patch(canManageSystem, resolveAlert);
router.route('/send-user/:userId').post(canManageUsers, sendUserAlert);

export default router;