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
  deactivation?: {
    isDeactivated: boolean;
    type: 'temporary' | 'permanent';
    deactivatedAt: Date;
    reactivationDate?: Date;
    reason?: string;
    markedForDeletion?: boolean;
    deletionScheduledAt?: Date;
  };
  otp?: {
    mobile?: {
      code: string;
      expiresAt: Date;
      verified: boolean;
    };
    email?: {
      code: string;
      expiresAt: Date;
      verified: boolean;
    };
  };
}

export type UserAccountType = "USER" | "ADMIN";
