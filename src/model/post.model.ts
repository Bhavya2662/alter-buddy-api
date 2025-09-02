import { IPostProps } from "../interface";
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema<IPostProps>(
     {
          body: { type: mongoose.Schema.Types.String, required: true },
          comments: [
               {
                    body: { type: mongoose.Schema.Types.String },
                    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                    postedOn: { type: mongoose.Schema.Types.Date },
               },
          ],
          likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
          subTitle: { type: mongoose.Schema.Types.String },
          title: { type: mongoose.Schema.Types.String, required: true },
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
     },
     {
          timestamps: true,
     }
);

export const Post = mongoose.model<IPostProps>("Post", PostSchema);
