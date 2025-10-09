import { Request, Response } from "express";
import { IControllerRoutes, IController, IBlogProps } from "../../../interface";
import { AuthForMentor, AuthForUser, AuthForAdmin } from "../../../middleware";
import { Blog, User } from "../../../model";
import { Ok, UnAuthorized, getTokenFromHeader, verifyToken } from "../../../utils";

export class BlogController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    // Public routes - no authentication required
    this.routes.push({
      path: "/blog",
      handler: this.GetAllBlog,
      method: "GET",
    });
    this.routes.push({
      handler: this.GetBlogById,
      method: "GET",
      path: "/blog/:id",
    });
    
    // User routes - authenticated users can create blogs
    this.routes.push({
      handler: this.UploadBlog,
      method: "POST",
      path: "/blog",
      middleware: [AuthForUser],
    });
    
    // User routes - users can only update their own blogs
    this.routes.push({
      handler: this.UpdateBlogById,
      method: "PUT",
      path: "/blog/:id",
      middleware: [AuthForUser],
    });
    
    // User routes - users can only delete their own blogs
    this.routes.push({
      handler: this.DeleteBlogById,
      method: "DELETE",
      path: "/blog/:id",
      middleware: [AuthForUser],
    });
    
    // User-specific routes
    this.routes.push({
      handler: this.GetUserBlogs,
      method: "GET",
      path: "/blog/user/my-blogs",
      middleware: [AuthForUser],
    });
    
    // Admin routes - admins can manage all blogs
    this.routes.push({
      handler: this.AdminDeleteBlog,
      method: "DELETE",
      path: "/blog/admin/:id",
      middleware: [AuthForAdmin],
    });
    
    this.routes.push({
      handler: this.AdminUpdateBlog,
      method: "PUT",
      path: "/blog/admin/:id",
      middleware: [AuthForAdmin],
    });
  }
  public async GetAllBlog(req: Request, res: Response) {
    try {
      const blog = await Blog.find().sort({ createdAt: -1 });
      return Ok(res, blog);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  public async GetBlogById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const blog = await Blog.findById({ _id: id });
      return Ok(res, blog);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  public async UploadBlog(req: Request, res: Response) {
    try {
      const { body, label, subLabel, blogLink, htmlContent, featuredImage, images, author, tags, isPublished, readTime } = req.body;
      if (!body || !label || !subLabel || !blogLink) {
        return UnAuthorized(res, "missing fields");
      }
      
      // Get user info from authenticated request
      const userId = (req as any).user?.id;
      const userData = (req as any).user?.userData;
      
      if (!userId) {
        return UnAuthorized(res, "User authentication required");
      }
      
      // Check if user has blog writing permissions
      const user = await User.findById(userId);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }
      
      if (!user.canWriteBlog) {
        return UnAuthorized(res, "You don't have permission to write blogs. Please contact admin for access.");
      }
      
      const blogData = {
        body,
        label,
        subLabel,
        blogLink,
        htmlContent,
        featuredImage,
        images,
        author: author || userData?.name || 'Anonymous',
        authorId: userId,
        tags,
        isPublished: isPublished !== undefined ? isPublished : true,
        readTime: readTime || 5
      };
      
      const blog = await new Blog(blogData).save();
      return Ok(res, `${blog.label} is uploaded`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  public async UpdateBlogById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return UnAuthorized(res, "User authentication required");
      }
      
      // Check if blog exists and belongs to the user
      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        return UnAuthorized(res, "Blog not found");
      }
      
      if (existingBlog.authorId?.toString() !== userId) {
        return UnAuthorized(res, "You can only update your own blogs");
      }
      
      const blog = await Blog.findByIdAndUpdate(
        { _id: id },
        { $set: { ...req.body } },
        { new: true }
      );
      return Ok(res, `${blog.label} is updated`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  
  public async DeleteBlogById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return UnAuthorized(res, "User authentication required");
      }
      
      // Check if blog exists and belongs to the user
      const existingBlog = await Blog.findById(id);
      if (!existingBlog) {
        return UnAuthorized(res, "Blog not found");
      }
      
      if (existingBlog.authorId?.toString() !== userId) {
        return UnAuthorized(res, "You can only delete your own blogs");
      }
      
      await Blog.findOneAndDelete({ _id: id });
      return Ok(res, `blog is deleted`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  
  public async GetUserBlogs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return UnAuthorized(res, "User authentication required");
      }
      
      const blogs = await Blog.find({ authorId: userId }).sort({ createdAt: -1 });
      return Ok(res, blogs);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  
  public async AdminDeleteBlog(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const blog = await Blog.findById(id);
      
      if (!blog) {
        return UnAuthorized(res, "Blog not found");
      }
      
      await Blog.findOneAndDelete({ _id: id });
      return Ok(res, `Blog "${blog.label}" has been deleted by admin`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  
  public async AdminUpdateBlog(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const blog = await Blog.findByIdAndUpdate(
        { _id: id },
        { $set: { ...req.body } },
        { new: true }
      );
      
      if (!blog) {
        return UnAuthorized(res, "Blog not found");
      }
      
      return Ok(res, `Blog "${blog.label}" has been updated by admin`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
