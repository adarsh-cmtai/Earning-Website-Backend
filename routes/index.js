import { Router } from 'express';
import userRoutes from './user/user.routes.js';
import adminSetupRoutes from './admin/adminSetupRoutes.js';
import adminRoutes from './admin/adminRoutes.js';

const router = Router();

router.use('/user', userRoutes);
router.use('/admin-setup', adminSetupRoutes);
router.use('/admin', adminRoutes);

export default router;