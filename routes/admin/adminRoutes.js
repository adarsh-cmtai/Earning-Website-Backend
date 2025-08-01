import { Router } from 'express';
import { verifyJWT } from '../../middlewares/authMiddleware.js';
import dashboardRoutes from './dashboardRoutes.js';
import userManagementRoutes from './userManagementRoutes.js';
import technicianRoutes from './technicianRoutes.js';
import alertRoutes from './alertRoutes.js';
import financeRoutes from './financeRoutes.js';
import contentRoutes from './contentRoutes.js';
import reportsRoutes from './reportsRoutes.js';
import securityRoutes from './securityRoutes.js';
import topicRoutes from './topicRoutes.js';
import supportRoutes from './supportRoutes.js';
import blogs from './blogRoutes.js'
import incomeVerificationRoutes from './incomeVerificationRoutes.js';

const router = Router();

router.use(verifyJWT);

router.use('/dashboard', dashboardRoutes);
router.use('/users', userManagementRoutes);
router.use('/technician', technicianRoutes);
router.use('/alerts', alertRoutes);
router.use('/finance', financeRoutes);
router.use('/content', contentRoutes);
router.use('/reports', reportsRoutes);
router.use('/security', securityRoutes);
router.use('/topics', topicRoutes);
router.use('/support', supportRoutes);
router.use('/blogs', blogs);
router.use('/income-verification', incomeVerificationRoutes);

export default router;