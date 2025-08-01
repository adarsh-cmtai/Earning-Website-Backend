import { Router } from 'express';
import { createSupportTicket, getUserTickets } from '../../controllers/user/supportController.js';

const router = Router();

router.route('/tickets').post(createSupportTicket);
router.route('/tickets').get(getUserTickets);

export default router;