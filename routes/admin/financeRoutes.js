import { Router } from 'express';
import { 
    getUserIncomeProfiles,
    updateIncomeStatus,
    processBulkPayout,
    markContributionAsPaid,
    setSuggestedContribution
} from '../../controllers/admin/financeController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageFinance = checkRole(['SUPER_ADMIN', 'FINANCE']);

router.route('/profiles').get(canManageFinance, getUserIncomeProfiles);
router.route('/update-status/:userId').patch(canManageFinance, updateIncomeStatus);
router.route('/bulk-payout').post(canManageFinance, processBulkPayout);
router.route('/contribution-paid/:userId').post(canManageFinance, markContributionAsPaid);
router.route('/set-contribution/:userId').post(canManageFinance, setSuggestedContribution);

export default router;