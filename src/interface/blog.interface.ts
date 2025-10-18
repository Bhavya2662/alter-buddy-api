import { Types } from "mongoose";

export interface IBlogProps {
  label: string;
  subLabel: string;
  body: string;
  htmlContent?: string;
  featuredImage?: string;
  images?: string[];
  author?: string;
  authorId?: Types.ObjectId;
  tags?: string[];
  isPublished?: boolean;
  readTime?: number;
}
