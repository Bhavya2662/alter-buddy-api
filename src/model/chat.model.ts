import { IChatProps } from "interface/chat.interface";
import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema<IChatProps>(
  {
    users: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      mentor: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor" },
    },
    sessionDetails: {
      roomId: { type: mongoose.Schema.Types.String, required: false },
      roomCode: {
        host: { type: mongoose.Schema.Types.String, required: false },
        mentor: { type: mongoose.Schema.Types.String, required: false },
      },
      roomName: { type: mongoose.Schema.Types.String, required: true },
      callType: {
        type: mongoose.Schema.Types.String,
        required: true,
        default: "audio",
      },
      duration: { type: mongoose.Schema.Types.String },
      startTime: { type: mongoose.Schema.Types.String },
      endTime: { type: mongoose.Schema.Types.String },
      actualStartTime: { type: mongoose.Schema.Types.Date, required: false },
      mentorJoined: { type: mongoose.Schema.Types.Boolean, default: false },
      userJoined: { type: mongoose.Schema.Types.Boolean, default: false },
      timerStarted: { type: mongoose.Schema.Types.Boolean, default: false },
      userJoinedAt: { type: mongoose.Schema.Types.Date },
      mentorJoinedAt: { type: mongoose.Schema.Types.Date },
      recordingId: { type: mongoose.Schema.Types.String, required: false },
      recordingUrl: { type: mongoose.Schema.Types.String, required: false },
      recordingStatus: {
        type: mongoose.Schema.Types.String,
        enum: ["recording", "completed", "failed", "processing"],
        required: false,
      },
    },
    message: [
      {
        message: { type: mongoose.Schema.Types.String },
        senderId: { type: mongoose.Schema.Types.String },
        senderName: { type: mongoose.Schema.Types.String },
        timestamp: { type: mongoose.Schema.Types.String },
        topic: { type: mongoose.Schema.Types.String },
      },
    ],
    status: {
      type: mongoose.Schema.Types.String,
      default: "PENDING",
      required: true,
    },
    isAnonymous: {
      type: mongoose.Schema.Types.Boolean,
      default: false,
      required: false,
    },
    anonymousSessionId: {
      type: mongoose.Schema.Types.String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Chat = mongoose.model<IChatProps>("session", ChatSchema);
