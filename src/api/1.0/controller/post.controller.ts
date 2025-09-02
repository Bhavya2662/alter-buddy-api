import { Request, Response } from "express";
import { IControllerRoutes, IController, IPostProps } from "../../../interface";
import { AuthForUser } from "../../../middleware";
import { Post, User } from "../../../model";
import mongoose from "mongoose";
import { getJwtToken, getTokenFromHeader, Ok, UnAuthorized, verifyToken } from "../../../utils";

export class PostController implements IController {
     public routes: IControllerRoutes[] = [];

     constructor() {
          this.routes.push({
               path: "/posts",
               handler: this.GetAllPosts,
               method: "GET",
          });
          this.routes.push({
               handler: this.GetPostById,
               method: "GET",
               path: "/posts/:id",
          });
          this.routes.push({
               path: "/posts",
               handler: this.CreateNewPost,
               method: "POST",
               middleware: [AuthForUser],
          });
          this.routes.push({
               handler: this.DeletePostById,
               method: "DELETE",
               path: "/posts",
               middleware: [AuthForUser],
          });
          this.routes.push({
               handler: this.GetMyUploadedPost,
               method: "GET",
               path: "/my/posts",
               middleware: [AuthForUser],
          });
     }

     public async GetMyUploadedPost(req: Request, res: Response) {
          try {
            const token = getTokenFromHeader(req);
            const verified = verifyToken(token);
            const user = await User.findById({ _id: verified.id });
            const posts = await Post.find({ userId: user._id });
            return Ok(res, posts);
          } catch (err) {
            return UnAuthorized(res, err);
          }
     }
     public async GetAllPosts(req: Request, res: Response) {
          try {
               const posts = await Post.find()
                    .populate("userId comments.postedBy likes", "name")
                    .sort({ createdAt: -1 });
               return Ok(res, posts);
          } catch (err) {
               return UnAuthorized(res, err);
          }
     }

     public async GetPostById(req: Request, res: Response) {
          try {
               const id = req.params.id;
               const post = await Post.findById({ _id: id }).populate("userId comments.postedBy likes", "name");
               return Ok(res, post);
          } catch (err) {
               return UnAuthorized(res, err);
          }
     }

     public async CreateNewPost(req: Request, res: Response) {
          try {
            const { body, title, subTitle }: IPostProps = req.body;
            if (!body || !title) {
              return UnAuthorized(res, `missing fields`);
            }
            const userToken = getTokenFromHeader(req);
            const verifyTokens = verifyToken(userToken) as any;
            const user = await User.findById({ _id: verifyTokens.id });
            const newPost = await new Post({
              title,
              body,
              userId: user._id,
              subTitle,
            }).save();
            return Ok(res, `finishing up for post ${newPost.title}`);
          } catch (err) {
            return UnAuthorized(res, err);
          }
     }

     public async DeletePostById(req: Request, res: Response) {
          try {
               const id = req.params.postId;
               const userToken = getJwtToken(req);
               const verifyTokens = verifyToken(userToken) as any;
               const user = await User.findById({ _id: verifyTokens.id });
               const post = await Post.findById({ _id: id });
               if (user._id.toString() !== (post.userId.toString() as string)) {
                    return UnAuthorized(res, "not authorized to delete post");
               }
               await Post.findByIdAndDelete({ _id: id });
               return Ok(res, `post is removed`);
          } catch (err) {
               return UnAuthorized(res, err);
          }
     }
}
