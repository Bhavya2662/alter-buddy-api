import { Request, Response } from "express";
import { IControllerRoutes, IController } from "../../../interface";
import { AuthForAdmin, AuthForUser } from "../../../middleware";
import { User, BuddyCoins, Transaction } from "../../../model";
import { Types } from "mongoose";
import { RazorPayService } from "../../../services/razorpay.services";
import { PaymentNotificationService } from "../../../services/payment-notification.service";
import { getTokenFromHeader, Ok, UnAuthorized, verifyToken } from "../../../utils";

function generateCustomTransactionId(
  prefix: string,
  totalLength: number
): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const prefixLength = prefix.length;
  const separator = "-";

  // Calculate the length of the random string component
  const randomStringLength = totalLength - prefixLength - separator.length;

  if (randomStringLength <= 0) {
    throw new Error(
      "Total length must be greater than the length of the prefix and separator."
    );
  }

  let randomString = "";

  // Generate a random string of the calculated length
  for (let i = 0; i < randomStringLength; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomString += chars[randomIndex];
  }

  // Create the transaction ID by combining the prefix with the random string
  return `${prefix}${separator}${randomString}`;
}

export class WalletController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/wallets",
      handler: this.GetAllWallets,
      method: "GET",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      path: "/wallets/:userId/transactions",
      handler: this.GetTransactionsByUserIdForAdmin,
      method: "GET",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      path: "/buddy-coins",
      handler: this.GetMyWallet,
      method: "GET",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.CreateBuddyCoinsRecharge,
      method: "POST",
      path: "/buddy-coins/recharge",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.ValidateRecharge,
      method: "GET",
      path: "/buddy-coins/process/:pLinkId",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.UseBuddyCoins,
      method: "PUT",
      path: "/buddy-coins/use",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetMyTransactions,
      method: "GET",
      path: "/buddy-coins/transactions/my",
      middleware: [AuthForUser],
    });
    // Test-only top-up route to avoid direct DB writes in tests
    this.routes.push({
      handler: this.TestTopUp,
      method: "POST",
      path: "/buddy-coins/topup-test",
      middleware: [AuthForUser],
    });
  }

  public GetAllWallets = async (req: Request, res: Response) => {
    try {
      const wallet = await BuddyCoins.find().populate("userId");
      return Ok(res, wallet);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  };

  public async GetTransactionsByUserIdForAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return UnAuthorized(res, "Invalid userId");
      }

      const transactions = await Transaction.find({ userId })
        .populate("walletId")
        .populate("userId")
        .sort({ createdAt: -1 }); // newest first

      return Ok(res, transactions);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMyWallet(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const user = await User.findById({ _id: verified.id });
      const wallet = await BuddyCoins.findOne({ userId: user._id });

      if (!wallet.id) {
        await new BuddyCoins({
          balance: 0,
          userId: user._id,
        }).save();
        return Ok(res, wallet);
      } else {
        console.log(wallet);
        return Ok(res, wallet);
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async CreateBuddyCoinsRecharge(req: Request, res: Response) {
    try {
      const { amount } = req.body;
      if (!amount) {
        return UnAuthorized(res, "please enter an amount");
      }

      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const user = await User.findById({ _id: verified.id });

      const razorPay = await RazorPayService.StartPayment({
        amount: amount * 100,
        email: user.email,
        userName: `${user.name.firstName} ${user.name.lastName}`,
        mobile: user.mobile,
      });

      return Ok(res, {
        message: "payment link generated",
        razorPay,
      });
    } catch (err) {
      console.log(err);
      if (err.error) {
        return UnAuthorized(res, err.error.description);
      }
      return UnAuthorized(res, err);
    }
  }

  public async ValidateRecharge(req: Request, res: Response) {
    try {
      const { pLinkId } = req.params;
      if (!pLinkId) {
        return UnAuthorized(res, "Missing payment ID");
      }

      const paymentStatus = await RazorPayService.VerifySignature({
        paymentId: pLinkId,
      });

      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      const user = await User.findById(verified.id);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      const wallet = await BuddyCoins.findOne({ userId: user._id });
      if (!wallet) {
        return UnAuthorized(res, "Wallet not found");
      }

      const amount = parseInt(paymentStatus.payment.amount.toString(), 10);

      // Ensure the wallet balance does not go negative
      if (amount < 0) {
        return UnAuthorized(res, "Invalid recharge amount");
      }

      const rechargeAmount = wallet.balance + amount / 100;

      const updatedWallet = await BuddyCoins.findByIdAndUpdate(
        wallet._id,
        { $set: { balance: rechargeAmount } },
        { new: true }
      );

      const transactionData = {
        closingBal: rechargeAmount,
        creditAmt: amount,
        walletId: updatedWallet._id,
        userId: user._id,
        transactionId: generateCustomTransactionId("BDDY", 10),
      } as any;

      if (paymentStatus.message === "payment successful") {
        transactionData.status = "success";
        transactionData.transactionType = "recharge successful";
      } else {
        transactionData.status = "failed";
        transactionData.transactionType = "recharge failed";
      }

      const savedTransaction = await new Transaction(transactionData).save();
      
      // Send payment notification for any debit transaction (session booking)
      if (transactionData.debitAmt && transactionData.debitAmt > 0) {
        await PaymentNotificationService.sendPaymentNotification({
          userId: user._id.toString(),
          userName: `${user.name.firstName} ${user.name.lastName}`,
          userEmail: user.email,
          amount: transactionData.debitAmt,
          transactionId: transactionData.transactionId,
          paymentId: transactionData.transactionId,
          status: 'success',
          transactionType: 'session_booking',
          timestamp: new Date()
        });
      }
      
      // Send payment notification to admin system
      if (paymentStatus.message === "payment successful") {
        await PaymentNotificationService.sendPaymentNotification({
          userId: user._id.toString(),
          userName: `${user.name.firstName} ${user.name.lastName}`,
          userEmail: user.email,
          amount: amount / 100,
          transactionId: transactionData.transactionId,
          paymentId: pLinkId,
          status: 'success',
          transactionType: 'session_booking',
          timestamp: new Date()
        });
      }
      
      return Ok(res, paymentStatus);
    } catch (err) {
      console.error(err); // Log the error for debugging
      return UnAuthorized(res, "An error occurred");
    }
  }

  public async UseBuddyCoins(req: Request, res: Response) {
    try {
      const {
        coinsToUsed,
        useType,
        userId,
      }: { coinsToUsed: number; useType: string; userId: string } = req.body;

      if (!coinsToUsed) {
        return UnAuthorized(res, "missing fields");
      }
      const user = await User.findById({ _id: userId });

      const wallet = await BuddyCoins.findOne({ userId: user._id });

      if (wallet) {
        await BuddyCoins.findByIdAndUpdate(
          { _id: wallet._id },
          { $set: { balance: wallet.balance - coinsToUsed } }
        );
        const transactionId = generateCustomTransactionId("BUDDY", 10);
        await new Transaction({
          transactionId,
          transactionType: useType,
          closingBal: wallet.balance - coinsToUsed,
          debitAmt: coinsToUsed,
          walletId: wallet._id,
          userId: user._id,
          status: "success",
        }).save();
        
        // Send payment notification for session bookings
        if (useType && useType.toLowerCase().includes('session')) {
          await PaymentNotificationService.sendPaymentNotification({
            userId: user._id.toString(),
            userName: `${user.name.firstName} ${user.name.lastName}`,
            userEmail: user.email,
            amount: coinsToUsed,
            transactionId,
            paymentId: transactionId,
            status: 'success',
            transactionType: 'session_booking',
            timestamp: new Date()
          });
        }
        
        return Ok(res, "SUCCESS");
      } else {
        return UnAuthorized(res, "FAILED");
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMyTransactions(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const transaction = await Transaction.find({
        userId: verified.id,
      })
        .populate("walletId")
        .populate("userId")
        .sort({ createdAt: -1 });
      console.log("TRANSACTIONS are", transaction);
      return Ok(res, transaction);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  // Test-only top-up handler
  public async TestTopUp(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV === "production") {
        return UnAuthorized(res, "Not allowed in production");
      }
      const { amount } = req.body as any;
      const topupAmount = Number(amount);
      if (!topupAmount || topupAmount <= 0) {
        return UnAuthorized(res, "Invalid amount");
      }

      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const user = await User.findById(verified.id);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      let wallet = await BuddyCoins.findOne({ userId: user._id });
      if (!wallet) {
        wallet = await new BuddyCoins({ balance: 0, userId: user._id }).save();
      }

      const newBalance = (wallet.balance || 0) + topupAmount;
      const updatedWallet = await BuddyCoins.findByIdAndUpdate(
        wallet._id,
        { $set: { balance: newBalance } },
        { new: true }
      );

      const transactionId = generateCustomTransactionId("BDDY", 10);
      await new Transaction({
        transactionId,
        transactionType: "topup_test",
        closingBal: newBalance,
        creditAmt: topupAmount,
        walletId: updatedWallet._id,
        userId: user._id,
        status: "success",
      }).save();

      return Ok(res, { message: "Top-up successful", balance: newBalance });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
