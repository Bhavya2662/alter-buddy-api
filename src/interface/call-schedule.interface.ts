import mongoose from "mongoose";
import { IUserProps } from "./user.interface";

export interface IMentorCallScheduleProps {
     mentorId: mongoose.Schema.Types.ObjectId;
     slots: ISlotProps[];
     slotsDate: string;
     mentorCode: string;
     userCode: string;
}

export interface ISlotProps {
     _id?: string;
     note?: string;
     time: string;
     booked: boolean;
     userId?: mongoose.Schema.Types.ObjectId;
     status: ISlotStatus;
     callType: ICallType;
     duration: number;
}

enum ISlotStatus {
     AVAILABLE = "available",
     ACCEPTED = "accepted",
     REJECTED = "rejected",
}

type ICallType = "chat" | "video" | "audio";
