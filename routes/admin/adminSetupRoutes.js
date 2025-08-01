import { Router } from 'express';
import { sendAdminOtp, verifyAndRegisterAdmin } from '../../controllers/admin/adminAuthController.js';

const router = Router();

router.route('/send-otp').post(sendAdminOtp);
router.route('/verify-and-register').post(verifyAndRegisterAdmin);

router.get('/dashboard', (req, res) => {
    res.json({ message: "Welcome to the Admin Dashboard" });
});

export default router;