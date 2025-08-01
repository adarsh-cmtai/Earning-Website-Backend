// controllers/admin/blogController.js
import asyncHandler from "express-async-handler";
import BlogPost from "../../models/blogPostModel.js";
import slugify from "slugify";
import { deleteFileFromS3 } from "../../services/s3Service.js";

// CREATE
export const createBlogPost = asyncHandler(async (req, res) => {
  // Data ab 'multipart/form-data' se aayega
  const { title, description, content, author } = req.body;
  // Tags ko frontend se JSON string ke roop mein bheja jayega
  const tags = JSON.parse(req.body.tags);

  if (!req.file) {
    res.status(400);
    throw new Error("Image is required.");
  }

  const post = new BlogPost({
    title,
    slug: slugify(title, { lower: true, strict: true }),
    image: {
      key: req.file.key, // multer-s3 se mila key
      url: req.file.location, // multer-s3 se mila URL
    },
    description,
    content,
    tags,
    author,
  });

  const createdPost = await post.save();
  res.status(201).json(createdPost);
});

// UPDATE
export const updateBlogPost = asyncHandler(async (req, res) => {
  const { title, description, content, author } = req.body;
  const tags = req.body.tags ? JSON.parse(req.body.tags) : undefined;
  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  // Agar nayi file upload hui hai
  if (req.file) {
    // Purani image ko S3 se delete karein
    await deleteFileFromS3(post.image.key);
    // Nayi image ki details DB mein update karein
    post.image = {
      key: req.file.key,
      url: req.file.location,
    };
  }

  // Baaki text fields update karein
  post.title = title || post.title;
  post.slug = title ? slugify(title, { lower: true, strict: true }) : post.slug;
  post.description = description || post.description;
  post.content = content || post.content;
  post.tags = tags || post.tags;
  post.author = author || post.author;

  const updatedPost = await post.save();
  res.status(200).json(updatedPost);
});

// DELETE
export const deleteBlogPost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id);

  if (post) {
    // DB se delete karne se pehle S3 se file delete karein
    await deleteFileFromS3(post.image.key);
    await post.deleteOne();
    res.status(200).json({ message: "Blog post removed" });
  } else {
    res.status(404);
    throw new Error("Blog post not found");
  }
});

// GET ALL
export const getAllBlogPostsForAdmin = asyncHandler(async (req, res) => {
  const posts = await BlogPost.find({}).sort({ createdAt: -1 });
  res.status(200).json(posts);
});
