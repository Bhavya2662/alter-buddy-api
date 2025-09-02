import { ITransactionProps } from "../interface";
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema<ITransactionProps>(
  {
    closingBal: { type: mongoose.Schema.Types.Number, required: true },
    creditAmt: { type: mongoose.Schema.Types.Number },
    debitAmt: { type: mongoose.Schema.Types.Number },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuddyCoin",
      required: true,
    },
    transactionType: { type: mongoose.Schema.Types.String, required: true },
    status: { type: mongoose.Schema.Types.String, required: true },
    transactionId: { type: mongoose.Schema.Types.String, required: true },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model<ITransactionProps>(
  "Transactions",
  TransactionSchema
);
