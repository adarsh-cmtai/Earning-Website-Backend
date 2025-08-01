import { Router } from 'express';
import { 
    getAllUsers, 
    getUserById, 
    suspendUser, 
    updateUser, 
    updateYoutubeStatus,
    resetUserPassword,
    getUserCompliance,
    getUserDetailsForAdmin,
    getManualIncomeSubmissions,
    reviewManualIncome
} from '../../controllers/admin/userManagementController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageUsers = checkRole(['SUPER_ADMIN', 'USER_MANAGER']);
const canManageFinance = checkRole(['SUPER_ADMIN', 'FINANCE']);

router.route('/').get(canManageUsers, getAllUsers);
router.route('/:userId').get(canManageUsers, getUserById);
router.route('/:userId').patch(canManageUsers, updateUser);
router.route('/:userId/details').get(canManageUsers, getUserDetailsForAdmin);
router.route('/suspend/:userId').patch(canManageUsers, suspendUser);
router.route('/youtube-status/:userId').patch(canManageUsers, updateYoutubeStatus);
router.route('/reset-password/:userId').post(canManageUsers, resetUserPassword);
router.route('/:userId/compliance').get(canManageUsers, getUserCompliance);

router.route('/income-submissions').get(canManageFinance, getManualIncomeSubmissions);
router.route('/income-submissions/:submissionId/review').post(canManageFinance, reviewManualIncome);


export default router;