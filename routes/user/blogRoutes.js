import { Router } from 'express';
import { getAllPublicBlogPosts, getPublicBlogPostBySlug } from '../../controllers/user/blogController.js';

const router = Router();

router.route('/').get(getAllPublicBlogPosts);
router.route('/:slug').get(getPublicBlogPostBySlug);

export default router;
