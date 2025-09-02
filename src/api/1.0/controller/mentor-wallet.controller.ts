import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
import { AuthForAdmin, AuthForMentor } from "../../../middleware";
import { MentorWallet } from "../../../model/mentor-wallet.model";
import { getTokenFromHeader, verifyToken, Ok, UnAuthorized } from "../../../utils";

export class MentorWalletController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/wallet/get-mentor-payment-history",
      handler: this.GetMentorWalletHistory,
      method: "POST",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      path: "/admin/mentor-wallet/history",
      handler: this.GetAllMentorWalletHistoryForAdmin,
      method: "GET",
      middleware: [AuthForAdmin],
    });
  }

  public async GetMentorWalletHistory(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const mentor = verifyToken(token); // gets mentor.id

      const transactions = await MentorWallet.find({
        mentorId: mentor.id,
      })
        .populate("mentorId", "name") // populating mentor's name
        .populate("userId", "name") // populating user's name
        .sort({ createdAt: -1 })
        .lean();

      return Ok(res, {
        total: transactions.length,
        transactions,
      });
    } catch (err) {
      console.error("Error fetching wallet history:", err);
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  }

  public async GetAllMentorWalletHistoryForAdmin(req: Request, res: Response) {
    try {
      const transactions = await MentorWallet.find({})
        .populate("mentorId", "name")
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .lean();

      // Transform data to include session details in the expected format
      const transformedTransactions = transactions.map((txn: any) => {
        const mentorName = txn.mentorId?.name 
          ? `${txn.mentorId.name.firstName || ''} ${txn.mentorId.name.lastName || ''}`.trim()
          : 'Unknown Mentor';
        
        const userName = txn.userId?.name 
          ? `${txn.userId.name.firstName || ''} ${txn.userId.name.lastName || ''}`.trim()
          : 'Unknown User';

        // Enhanced description with session details
        let enhancedDescription = txn.description || 'Session booking';
        if (txn.sessionDetails) {
          enhancedDescription += ` - ${txn.sessionDetails.duration} min ${txn.sessionDetails.callType} session`;
          if (txn.sessionDetails.sessionTime) {
            enhancedDescription += ` at ${txn.sessionDetails.sessionTime}`;
          }
        }

        return {
          ...txn,
          mentorName,
          userName,
          description: enhancedDescription,
          // Keep original fields for backward compatibility
          date: txn.createdAt,
          // Add session details for frontend use
          sessionDuration: txn.sessionDetails?.duration,
          sessionCallType: txn.sessionDetails?.callType,
          sessionDate: txn.sessionDetails?.sessionDate,
          sessionTime: txn.sessionDetails?.sessionTime,
          bookingType: txn.sessionDetails?.bookingType,
        };
      });

      console.log("=== MENTOR WALLET DEBUG ===");
      console.log("Total transactions found:", transactions.length);
      console.log("First transaction sample:", transformedTransactions[0]);
      console.log("Response structure:", {
        data: transformedTransactions.length > 0 ? "[...transactions]": [],
        total: transformedTransactions.length
      });
      console.log("=== END DEBUG ===");

      return Ok(res, {
        data: transformedTransactions,
        total: transformedTransactions.length
      });
    } catch (err) {
      console.error("Admin mentor wallet history error:", err);
      return UnAuthorized(res, err instanceof Error ? err.message : "Unknown error");
    }
  }

}
