import mongoose from "mongoose";

export interface INotificationProps {
  label: string;
  subTitle?: string;
  content: string;
  notificationType: "offer" | "call";
  markAsRead: boolean;
  notificationFor: "user" | "mentor";
  notificationTo: mongoose.Schema.Types.ObjectId;
  notificationBy: mongoose.Schema.Types.ObjectId;
}
