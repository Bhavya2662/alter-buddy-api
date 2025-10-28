import mongoose from "mongoose";

interface IMentorNameProps {
  firstName: string;
  lastName: string;
}

interface IMentorContactProps {
  email: string;
  mobile: string;
  address: string;
}

export interface IMentorAuthProps {
  username: string;
  password: string;
}

interface IMentorAccountStatus {
  verification: boolean;
  block: boolean;
  online: boolean;
}

export interface IMentorProps {
  name: IMentorNameProps;
  contact: IMentorContactProps;
  auth: IMentorAuthProps;
  category: mongoose.Schema.Types.ObjectId[];
  specialists: string[];
  accountStatus: IMentorAccountStatus;
  acType: "MENTOR";
  inCall?: boolean;
  isUnavailable?: boolean;
  videoLink?: string;
  description?: string;
  image: string;
  languages: string[];
  status: boolean;
  qualification: string;
  whatCanAsk?: string[];
  maxSlotTime: number;
  chatPrice?: number;
  audioPrice?: number;
  videoPrice?: number;

}

export interface ICategoryProps {
  title: string;
  status: boolean;
}
