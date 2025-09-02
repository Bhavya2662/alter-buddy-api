import { ITopMentorProps } from "../interface";
import mongoose from "mongoose";

const TopMentorSchema = new mongoose.Schema<ITopMentorProps>(
     {
          active: { type: mongoose.Schema.Types.Boolean, required: true },
          mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true },
     },
     {
          timestamps: true,
     }
);

export const TopMentor = mongoose.model<ITopMentorProps>("TopMentor", TopMentorSchema);
