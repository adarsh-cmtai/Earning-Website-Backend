import { Router } from 'express';
import { getPublicContent } from '../../controllers/user/contentController.js';

const router = Router();

router.route('/').get(getPublicContent);

export default router;