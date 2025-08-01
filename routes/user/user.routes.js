import { Router } from 'express';
import { 
    registerUser, sendOtp, verifyOtp, loginUser, logoutUser, getCurrentUser,forgotPassword, resetPassword 
} from '../../controllers/user/userAuthController.js';
import userDashboardRoutes from './userDashboardRoutes.js';
import userAssignmentsRoutes from './userAssignmentsRoutes.js';
import userAiVideosRoutes from './userAiVideosRoutes.js';
import userDownlineRoutes from './userDownlineRoutes.js';
import userNotificationRoutes from './userNotificationRoutes.js';
import userIncomeRoutes from './userIncomeRoutes.js';
import userComplianceRoutes from './userComplianceRoutes.js';
import userProfileRoutes from './userProfileRoutes.js';
import userSupportRoutes from './userSupportRoutes.js';
import userProfileSetupRoutes from './userProfileSetupRoutes.js';
import userTopicRoutes from './userTopicRoutes.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';
import userContentRoutes from './userContentRoutes.js';

const router = Router();
router.route("/send-otp").post(sendOtp);
router.route("/verify-otp").post(verifyOtp);
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.use('/public-content', userContentRoutes);

router.use(verifyJWT);
router.route("/logout").post(logoutUser);
router.route("/current-user").get(getCurrentUser);
router.use('/dashboard', userDashboardRoutes);
router.use('/assignments', userAssignmentsRoutes);
router.use('/ai-videos', userAiVideosRoutes);
router.use('/downline', userDownlineRoutes);
router.use('/notifications', userNotificationRoutes);
router.use('/income', userIncomeRoutes);
router.use('/compliance', userComplianceRoutes);
router.use('/profile', userProfileRoutes);
router.use('/support', userSupportRoutes);
router.use('/profile-setup', userProfileSetupRoutes);
router.use('/topics', userTopicRoutes);

export default router;