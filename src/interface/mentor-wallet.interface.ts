import { Types } from "mongoose";

export interface IMentorWallet {
  userId: Types.ObjectId;
  mentorId: Types.ObjectId;
  slotId?: Types.ObjectId;
  amount: number;
  mentorShare: number;
  adminShare: number;
  type: "debit" | "credit" | "refund";
  status: "confirmed" | "refunded";
  description?: string;
  // Session details
  sessionDetails?: {
    duration: number; // in minutes
    callType: "video" | "audio" | "chat";
    sessionDate: Date;
    sessionTime: string; // e.g., "10:30 AM"
    bookingType: "slot" | "instant";
  };
  createdAt?: Date;
  updatedAt?: Date;
}
