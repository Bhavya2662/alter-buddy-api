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
  packageId?: mongoose.Schema.Types.ObjectId; // Reference to SessionPackage for package sessions
  isSupportSession?: boolean; // Indicates if this is a 1-week chat support session
  supportExpiryDate?: Date; // Expiry date for support sessions
  originalPackageId?: mongoose.Schema.Types.ObjectId; // Reference to the original package that triggered this support session
}
export type callStatus =
  | "REJECTED"
  | "ONGOING"
  | "COMPLETED"
  | "PENDING"
  | "ACCEPTED";
export type callType = "video" | "audio" | "chat";
