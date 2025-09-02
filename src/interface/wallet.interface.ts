import mongoose from "mongoose";

export interface IBuddyCoins {
  balance: number;
  userId: mongoose.Schema.Types.ObjectId;
}
