import { Router } from 'express';
import { getAllTickets, getTicketById, addResponseToTicket } from '../../controllers/admin/supportController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageSupport = checkRole(['SUPER_ADMIN', 'USER_MANAGER']);

router.route('/').get(canManageSupport, getAllTickets);
router.route('/:ticketId').get(canManageSupport, getTicketById);
router.route('/:ticketId/respond').post(canManageSupport, addResponseToTicket);

export default router;