import { Router } from 'express';
import { getTodaysAssignments, completeTask } from '../../controllers/user/userAssignmentsController.js';

const router = Router();

router.route('/').get(getTodaysAssignments);
router.route('/complete').post(completeTask);

export default router;