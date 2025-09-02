import mongoose from "mongoose";
import { IMentorWallet } from "interface/mentor-wallet.interface";

const MentorWalletSchema = new mongoose.Schema<IMentorWallet>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mentor",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CallSchedule",
      required: false,
    },
    amount: {
      type: mongoose.Schema.Types.Number,
      required: true,
    },
    mentorShare: {
      type: mongoose.Schema.Types.Number,
      required: true,
    },
    adminShare: {
      type: mongoose.Schema.Types.Number,
      required: true,
    },
    type: {
      type: mongoose.Schema.Types.String,
      enum: ["debit", "credit", "refund"],
      required: true,
    },
    status: {
      type: mongoose.Schema.Types.String,
      enum: ["confirmed", "refunded"],
      required: true,
    },
    description: {
      type: mongoose.Schema.Types.String,
      required: false,
    },
    sessionDetails: {
      duration: {
        type: mongoose.Schema.Types.Number,
        required: false,
      },
      callType: {
        type: mongoose.Schema.Types.String,
        enum: ["video", "audio", "chat"],
        required: false,
      },
      sessionDate: {
        type: mongoose.Schema.Types.Date,
        required: false,
      },
      sessionTime: {
        type: mongoose.Schema.Types.String,
        required: false,
      },
      bookingType: {
        type: mongoose.Schema.Types.String,
        enum: ["slot", "instant"],
        required: false,
      },
    }
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export const MentorWallet = mongoose.model<IMentorWallet>(
  "MentorWallet",
  MentorWalletSchema
);
