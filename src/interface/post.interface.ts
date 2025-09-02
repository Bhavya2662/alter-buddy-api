import mongoose from "mongoose";
import { IUserProps } from "./user.interface";

export interface IPostProps {
     title: string;
     body: string;
     userId: any;
     likes?: any[];
     comments?: IPostCommentProps[];
     subTitle?: string; // if any
}

export interface IPostCommentProps {
     postedBy: any;
     body: string;
     postedOn: Date;
}
