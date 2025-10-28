import { IMentorProps } from "../interface";
import mongoose from "mongoose";

const MentorSchema = new mongoose.Schema<IMentorProps>(
  {
    auth: {
      username: { type: mongoose.Schema.Types.String, required: true },
      password: { type: mongoose.Schema.Types.String, required: true },
    },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: "Category",
      },
    ],
    contact: {
      email: {
        type: mongoose.Schema.Types.String,
        //  required: true
      },
      mobile: {
        type: mongoose.Schema.Types.String,
        //  required: true
      },
      address: {
        type: mongoose.Schema.Types.String,
        // required: true
      },
    },
    name: {
      firstName: {
        type: mongoose.Schema.Types.String,
        // required: true,
      },
      lastName: {
        type: mongoose.Schema.Types.String,
        // required: true
      },
    },
    specialists: [
      {
        type: mongoose.Schema.Types.String,
        // required: true
      },
    ],
    accountStatus: {
      block: { type: mongoose.Schema.Types.Boolean, default: false },
      online: { type: mongoose.Schema.Types.Boolean, default: false },
      verification: {
        type: mongoose.Schema.Types.Boolean,
        default: false,
      },
    },
    acType: { type: mongoose.Schema.Types.String, default: "MENTOR" },
    inCall: { type: mongoose.Schema.Types.Boolean, default: false },
    isUnavailable: { type: mongoose.Schema.Types.Boolean, default: false },
    videoLink: { type: mongoose.Schema.Types.String },
    description: { type: mongoose.Schema.Types.String },
    image: {
      type: mongoose.Schema.Types.String,
      // required: true
    },

    languages: [
      {
        type: mongoose.Schema.Types.String,
        // required: true
      },
    ],

    status: { type: mongoose.Schema.Types.Boolean },
    qualification: {
      type: mongoose.Schema.Types.String,
      //  required: true
    },
    whatCanAsk: [
      {
        type: mongoose.Schema.Types.String,
        // required: true
      },
    ],
    maxSlotTime: { type: mongoose.Schema.Types.Number },
    chatPrice: { type: mongoose.Schema.Types.Number, default: 0 },
    audioPrice: { type: mongoose.Schema.Types.Number, default: 0 },
    videoPrice: { type: mongoose.Schema.Types.Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Mentor = mongoose.model<IMentorProps>("Mentor", MentorSchema);
