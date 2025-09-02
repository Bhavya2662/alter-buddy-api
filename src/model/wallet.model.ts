import { IBuddyCoins } from "../interface";
import mongoose from "mongoose";

const BuddyCoinSchema = new mongoose.Schema<IBuddyCoins>(
  {
    balance: { type: mongoose.Schema.Types.Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: 100 },
  },
  { timestamps: true }
);

export const BuddyCoins = mongoose.model<IBuddyCoins>(
  "BuddyCoin",
  BuddyCoinSchema
);
