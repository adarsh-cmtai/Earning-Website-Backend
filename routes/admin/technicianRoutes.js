import { Router } from 'express';
import { 
    getAiVideos, 
    uploadAiVideo, 
    deleteAiVideo,
    assignLinksToUser,
    assignLinksToUserCSV,
    getAssignmentsForUser,
    allocateAiVideos
} from '../../controllers/admin/technicianController.js';
import { checkRole } from '../../middlewares/roleMiddleware.js';
import { upload } from '../../middlewares/uploadMiddleware.js';
import multer from 'multer';

const router = Router();
const memoryStorage = multer.memoryStorage();
const uploadCsvToMemory = multer({ storage: memoryStorage });
const canManageTechnicianTasks = checkRole(['SUPER_ADMIN', 'TECHNICIAN']);

router.route('/ai-videos').get(canManageTechnicianTasks, getAiVideos);
router.route('/ai-videos/upload').post(canManageTechnicianTasks, upload.single('videoFile'), uploadAiVideo);
router.route('/ai-videos/allocate').post(canManageTechnicianTasks, allocateAiVideos);
router.route('/ai-videos/:videoId').delete(canManageTechnicianTasks, deleteAiVideo);

router.route('/assignments/assign').post(canManageTechnicianTasks, assignLinksToUser);
router.route('/assignments/assign-csv').post(canManageTechnicianTasks, uploadCsvToMemory.single('csvFile'), assignLinksToUserCSV);
router.route('/assignments/:userId').get(canManageTechnicianTasks, getAssignmentsForUser);

export default router;
