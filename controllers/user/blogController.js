import { asyncHandler } from "../../utils/asyncHandler.js";
import BlogPost from "../../models/blogPostModel.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

const getAllPublicBlogPosts = asyncHandler(async (req, res) => {
    const posts = await BlogPost.find({}).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, posts, "Blog posts fetched successfully."));
});

const getPublicBlogPostBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const post = await BlogPost.findOne({ slug });

    if (!post) {
        throw new ApiError(404, "Blog post not found.");
    }
    
    return res.status(200).json(new ApiResponse(200, post, "Blog post fetched successfully."));
});


export { getAllPublicBlogPosts, getPublicBlogPostBySlug };
