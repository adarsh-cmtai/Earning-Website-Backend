import { Router } from 'express';
import { 
    getProfile, 
    updatePersonalDetails, 
    updatePaymentDetails, 
    changePassword,
    updateNotificationPreferences,logoutAllDevices
} from '../../controllers/user/userProfileController.js';

const router = Router();

router.route('/').get(getProfile);
router.route('/personal').patch(updatePersonalDetails);
router.route('/payment').patch(updatePaymentDetails);
router.route('/change-password').post(changePassword);
router.route('/notifications').patch(updateNotificationPreferences);
router.route('/logout-all').post(logoutAllDevices);

export default router;