import mongoose from "mongoose";

export interface IUserProps {
  name: { firstName: string; lastName: string };
  mobile: string;
  email: string;
  password: string;
  acType: UserAccountType;
  verified: boolean;
  block: boolean;
  online: boolean;
  referralCode: string;
  myInitialCategories: mongoose.Schema.Types.ObjectId[];
  dob: string;
}

export type UserAccountType = "USER" | "ADMIN";
