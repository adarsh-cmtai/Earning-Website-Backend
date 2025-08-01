// models/blogPostModel.js
import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    image: {
      key: { type: String, required: true }, // S3 object key (e.g., images/12345.jpg)
      url: { type: String, required: true }, // S3 public URL
    },
    description: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], required: true },
    author: { type: String, required: true, default: "UEIEP Team" },
  },
  { timestamps: true }
);

const BlogPost = mongoose.model("BlogPost", blogPostSchema);
export default BlogPost;
