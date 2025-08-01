import { Router } from 'express';
import { getAllTopics, createTopic, deleteTopic } from '../../controllers/admin/topicController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageContent = checkRole(['SUPER_ADMIN', 'CONTENT_MANAGER']);

router.route('/').get(canManageContent, getAllTopics);
router.route('/').post(canManageContent, createTopic);
router.route('/:topicId').delete(canManageContent, deleteTopic);

export default router;