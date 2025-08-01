// routes/admin/blogRoutes.js
import express from "express";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getAllBlogPostsForAdmin,
} from "../../controllers/admin/blogController.js";
import { checkRole } from '../../middlewares/roleMiddleware.js';
import { upload } from "../../middlewares/uploadMiddleware.js"; // Aapka middleware import karein

const router = express.Router();
const canManageSecurity = checkRole(['SUPER_ADMIN']);

router
  .route("/blog")
  .get(canManageSecurity, getAllBlogPostsForAdmin)
  .post(canManageSecurity, upload.single("image"), createBlogPost);

router
  .route("/blog/:id")
  .put(canManageSecurity, upload.single("image"), updateBlogPost)
  .delete(canManageSecurity, deleteBlogPost);

export default router;
