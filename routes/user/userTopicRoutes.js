import { Router } from 'express';
import { getActiveTopics } from '../../controllers/user/topicController.js';

const router = Router();

router.route('/').get(getActiveTopics);

export default router;