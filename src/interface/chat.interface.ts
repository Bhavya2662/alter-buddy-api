import mongoose from "mongoose";

export interface IChatProps {
  users: {
    user: mongoose.Schema.Types.ObjectId;
    mentor: mongoose.Schema.Types.ObjectId;
  };
  sessionDetails: {
    roomId: string;
    roomCode: {
      host: string;
      mentor: string;
    };
    roomName: string;
    description?: string;
    callType: callType;
    duration: string;
    startTime: string;
    endTime: string;
    actualStartTime?: Date;
    mentorJoined?: boolean;
    userJoined?: boolean;
    timerStarted?: boolean;
    userJoinedAt?: Date;
    mentorJoinedAt?: Date;
    recordingId?: string;
    recordingUrl?: string;
    recordingStatus?: "recording" | "completed" | "failed" | "processing";
  };
  message: [
    {
      messageId: mongoose.Schema.Types.String;
      message: mongoose.Schema.Types.String;
      senderId: mongoose.Schema.Types.String;
      senderName: mongoose.Schema.Types.String;
      timestamp: mongoose.Schema.Types.String;
      topic: mongoose.Schema.Types.String;
    }
  ];
  status?: callStatus;
  isAnonymous?: boolean;
  anonymousSessionId?: string;
  isChatSupport?: boolean;
  packageId?: mongoose.Schema.Types.ObjectId;
  supportExpiryDate?: Date;
  originalPackageId?: mongoose.Schema.Types.ObjectId;
}
export type callStatus =
  | "REJECTED"
  | "ONGOING"
  | "COMPLETED"
  | "PENDING"
  | "ACCEPTED";
export type callType = "video" | "audio" | "chat";
