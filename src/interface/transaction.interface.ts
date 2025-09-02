import { ObjectId } from "mongoose";

export interface ITransactionProps {
  creditAmt?: number;
  debitAmt?: number;
  closingBal: number;
  userId: ObjectId;
  walletId: ObjectId;
  transactionType: string;
  status: "success" | "failed";
  transactionId: string;
}
