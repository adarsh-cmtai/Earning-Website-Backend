import { Router } from 'express';
import { 
    getIncomeSummary, 
    getTransactions, 
    getContributionHistory,
    createContributionOrder,
    verifyContributionPayment
} from '../../controllers/user/incomeController.js';

const router = Router();

router.route('/summary').get(getIncomeSummary);
router.route('/transactions').get(getTransactions);
router.route('/contributions').get(getContributionHistory);
router.route('/contributions/create-order').post(createContributionOrder);
router.route('/contributions/verify-payment').post(verifyContributionPayment);

export default router;