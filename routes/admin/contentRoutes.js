import { Router } from 'express';
import { 
    getContent, 
    updateContent,
    addListItem,
    updateListItem,
    deleteListItem
} from '../../controllers/admin/contentController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';

const router = Router();
const canManageContent = checkRole(['SUPER_ADMIN', 'CONTENT_MANAGER']);

router.route('/').get(canManageContent, getContent);
router.route('/update').post(canManageContent, updateContent);

router.route('/:contentType/add').post(canManageContent, addListItem);
router.route('/:contentType/:itemId').patch(canManageContent, updateListItem);
router.route('/:contentType/:itemId').delete(canManageContent, deleteListItem);

export default router;