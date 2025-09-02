import { Types } from "mongoose";

export interface IGroupSession {
  _id?: Types.ObjectId | string;

  mentorId: Types.ObjectId | string;
  categoryId: Types.ObjectId | string;

  title: string;
  description?: string;

  sessionType: "chat" | "audio" | "video";
  price: number;

  capacity: number;
  bookedUsers?: (Types.ObjectId | string)[];

  scheduledAt: Date;

  status?: "scheduled" | "completed" | "cancelled";

  joinLink: string;
  shareableLink?: string;
  roomId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}
