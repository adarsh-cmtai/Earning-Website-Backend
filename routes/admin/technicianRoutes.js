import { Router } from 'express';
import { 
    getAiVideos, 
    uploadAiVideo, 
    deleteAiVideo,
    getAssignmentBatches, 
    uploadAssignmentLinks,
    getNonCompliantUsers,
    distributeAssignments,
    uploadAssignmentCsv,
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

router.route('/assignments').get(canManageTechnicianTasks, getAssignmentBatches);
router.route('/assignments/upload').post(canManageTechnicianTasks, uploadAssignmentLinks);
router.route('/assignments/upload-csv').post(canManageTechnicianTasks, uploadCsvToMemory.single('csvFile'), uploadAssignmentCsv);
router.route('/assignments/:batchId/non-compliant').get(canManageTechnicianTasks, getNonCompliantUsers);
router.route('/assignments/:batchId/distribute').post(canManageTechnicianTasks, distributeAssignments);

export default router;