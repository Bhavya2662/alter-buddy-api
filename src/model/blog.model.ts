import { IBlogProps } from "../interface";
import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema<IBlogProps>(
  {
    body: { type: mongoose.Schema.Types.String, required: true },
    label: { type: mongoose.Schema.Types.String, required: true },
    subLabel: { type: mongoose.Schema.Types.String },
    blogLink: { type: mongoose.Schema.Types.String, required: true },
    htmlContent: { type: mongoose.Schema.Types.String },
    featuredImage: { type: mongoose.Schema.Types.String },
    images: [{ type: mongoose.Schema.Types.String }],
    author: { type: mongoose.Schema.Types.String },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags: [{ type: mongoose.Schema.Types.String }],
    isPublished: { type: mongoose.Schema.Types.Boolean, default: true },
    readTime: { type: mongoose.Schema.Types.Number, default: 5 },
  },
  {
    timestamps: true,
  }
);

export const Blog = mongoose.model<IBlogProps>("Blog", BlogSchema);
