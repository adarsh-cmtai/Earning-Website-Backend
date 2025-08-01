import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../../controllers/user/notificationController.js';

const router = Router();

router.route('/').get(getNotifications);
router.route('/:notificationId/read').post(markAsRead);
router.route('/read-all').post(markAllAsRead);

export default router;