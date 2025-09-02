import mongoose from "mongoose";

export interface ITopMentorProps {
     mentorId: mongoose.Schema.Types.ObjectId;
     active: boolean;
}
