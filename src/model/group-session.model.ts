
import mongoose, { Schema } from "mongoose";
import { IGroupSession } from "../interface/group-session.interface";

const GroupSessionSchema = new Schema<IGroupSession>(
  {
    mentorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    sessionType: {
      type: String,
      enum: ["chat", "audio", "video"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    bookedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    scheduledAt: {
      type: Date,
      required: true,
    },
    joinLink: {
      type: String,
      required: false,
    },
    shareableLink: {
      type: String,
      unique: true,
    },
    roomId: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

export const GroupSession = mongoose.model<IGroupSession>(
  "GroupSession",
  GroupSessionSchema
);
