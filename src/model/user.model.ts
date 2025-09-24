import { IUserProps } from "interface/user.interface";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema<IUserProps>(
     {
          acType: { type: mongoose.Schema.Types.String, required: true, default: "USER" },
          email: { type: mongoose.Schema.Types.String, required: true, lowercase: true },
          mobile: { type: mongoose.Schema.Types.String },
          password: { type: mongoose.Schema.Types.String },
          name: {
               firstName: { type: mongoose.Schema.Types.String, lowercase: true },
               lastName: { type: mongoose.Schema.Types.String, lowercase: true },
          },
          block: { type: mongoose.Schema.Types.Boolean, default: false },
          verified: { type: mongoose.Schema.Types.Boolean, default: false },
          online: { type: mongoose.Schema.Types.Boolean, default: false },
          referralCode: { type: mongoose.Schema.Types.String },
          myInitialCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" }],
          dob: { type: mongoose.Schema.Types.String },
          deactivation: {
               isDeactivated: { type: mongoose.Schema.Types.Boolean, default: false },
               type: { type: mongoose.Schema.Types.String, enum: ["temporary", "permanent"] },
               deactivatedAt: { type: mongoose.Schema.Types.Date },
               reactivationDate: { type: mongoose.Schema.Types.Date },
               reason: { type: mongoose.Schema.Types.String },
               markedForDeletion: { type: mongoose.Schema.Types.Boolean, default: false },
               deletionScheduledAt: { type: mongoose.Schema.Types.Date },
          },
          otp: {
               mobile: {
                    code: { type: mongoose.Schema.Types.String },
                    expiresAt: { type: mongoose.Schema.Types.Date },
                    verified: { type: mongoose.Schema.Types.Boolean, default: false },
               },
               email: {
                    code: { type: mongoose.Schema.Types.String },
                    expiresAt: { type: mongoose.Schema.Types.Date },
                    verified: { type: mongoose.Schema.Types.Boolean, default: false },
               },
          },
     },
     {
          timestamps: true,
     }
);

export const User = mongoose.model<IUserProps>("User", UserSchema);
