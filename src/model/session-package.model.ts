
import mongoose, { Schema, Document } from "mongoose";

export interface ISessionPackage extends Document {
  userId?: mongoose.Types.ObjectId; // Optional for mentor-created templates
  mentorId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  type: "chat" | "audio" | "video";
  totalSessions: number;
  remainingSessions: number;
  price: number;
  duration?: number; // Optional session duration in minutes
  status: "active" | "expired" | "template" | "chat_support_active";
  expiryDate?: Date;
  chatSupportExpiresAt?: Date;
}

const SessionPackageSchema: Schema<ISessionPackage> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false }, // Optional for templates
    mentorId: { type: Schema.Types.ObjectId, ref: "Mentor", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["chat", "audio", "video"], required: true },
    totalSessions: { type: Number, required: true },
    remainingSessions: { type: Number, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: false }, // Optional session duration in minutes
    status: { type: String, enum: ["active", "expired", "template", "chat_support_active"], default: "active" },
    expiryDate: { type: Date, required: false }, // Optional expiry date
    chatSupportExpiresAt: { type: Date, required: false }, // Chat support expiry date
  },
  { timestamps: true }
);

export const SessionPackage = mongoose.model<ISessionPackage>(
  "SessionPackage",
  SessionPackageSchema
);
