import { INotificationProps } from "../interface";
import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema<INotificationProps>(
  {
    markAsRead: { type: mongoose.Schema.Types.Boolean, default: false },
    content: { type: mongoose.Schema.Types.String, required: true },
    label: { type: mongoose.Schema.Types.String, required: true },
    notificationFor: { type: mongoose.Schema.Types.String, default: "user" },
    notificationType: { type: mongoose.Schema.Types.String, default: "offer" },
    subTitle: { type: mongoose.Schema.Types.String },
    notificationTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },
    notificationBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotificationProps>(
  "Notification",
  NotificationSchema
);
