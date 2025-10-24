import { Request, Response } from "express";
import { GroupSession } from "../../../model/group-session.model";
import { Ok, UnAuthorized } from "../../../utils";
import { IController, IControllerRoutes } from "../../../interface";
import { AuthForMentor, AuthForUser } from "../../../middleware";
import { User, Mentor, BuddyCoins, Transaction } from "../../../model";
import { MentorWallet } from "../../../model/mentor-wallet.model";
import { PaymentNotificationService } from "../../../services/payment-notification.service";
import { MailSender } from "../../../services/mail-sender.service";
import moment from "moment-timezone";

function generateCustomTransactionId(prefix: string, totalLength: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const prefixLength = prefix.length;
  const separator = "-";
  const randomStringLength = totalLength - prefixLength - separator.length;
  if (randomStringLength <= 0) {
    throw new Error("Total length must be greater than the length of the prefix and separator.");
  }
  let randomString = "";
  for (let i = 0; i < randomStringLength; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    randomString += chars[randomIndex];
  }
  return `${prefix}${separator}${randomString}`;
}

export class GroupSessionController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes = [
      {
        path: "/group-session",
        method: "POST",
        handler: this.CreateGroupSession,
        middleware: [AuthForMentor],
      },
      {
        path: "/group-session/mentor/:mentorId",
        method: "GET",
        handler: this.GetMentorGroupSessions,
      },
      {
        path: "/group-session/book/:sessionId",
        method: "PUT",
        handler: this.BookGroupSession,
        middleware: [AuthForUser],
      },
      {
        path: "/group-session/:id",
        method: "PATCH",
        handler: this.UpdateGroupSession,
        middleware: [AuthForMentor],
      },
      {
        path: "/group-session/:id",
        method: "DELETE",
        handler: this.DeleteGroupSession,
        middleware: [AuthForMentor],
      },
      {
        path: "/group-session/join/:roomId",
        method: "GET",
        handler: this.GetGroupSessionByRoomId,
      },
      {
        path: "/group-session/all",
        method: "GET",
        handler: this.GetAllGroupSessions,
      },
    ];
  }

  public async CreateGroupSession(req: Request, res: Response) {
    try {
      const {
        mentorId,
        categoryId,
        title,
        description,
        sessionType,
        price,
        capacity,
        scheduledAt,
        joinLink,
      } = req.body;

      // Generate unique identifiers
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const shareableLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/group-session/join/${roomId}`;

      const session = new GroupSession({
        mentorId,
        categoryId,
        title,
        description,
        sessionType,
        price,
        capacity,
        scheduledAt,
        joinLink,
        shareableLink,
        roomId,
      });

      const saved = await session.save();
      return Ok(res, saved);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorGroupSessions(req: Request, res: Response) {
    try {
      const { mentorId } = req.params;
      const sessions = await GroupSession.find({ mentorId }).populate("categoryId bookedUsers");
      return Ok(res, sessions);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async BookGroupSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      const session = await GroupSession.findById(sessionId);
      if (!session) return UnAuthorized(res, "Session not found");

      // Robust duplicate booking check (handles ObjectId vs string)
      const alreadyBooked = (session.bookedUsers || []).some((u: any) => u?.toString() === userId);
      if (alreadyBooked) {
        return UnAuthorized(res, "User already booked");
      }

      if ((session.bookedUsers?.length || 0) >= session.capacity) {
        return UnAuthorized(res, "Session is full");
      }

      // Handle payment via BuddyCoins if session has a price
      const price = Number(session.price) || 0;
      let transactionId: string | null = null;
      let user: any = null;

      if (price > 0) {
        user = await User.findById(userId);
        if (!user) return UnAuthorized(res, "User not found");

        const wallet = await BuddyCoins.findOne({ userId: user._id });
        if (!wallet) return UnAuthorized(res, "Wallet not found");

        if (wallet.balance < price) {
          return UnAuthorized(res, "Insufficient wallet balance");
        }

        // Deduct coins
        const newBalance = wallet.balance - price;
        await BuddyCoins.findByIdAndUpdate({ _id: wallet._id }, { $set: { balance: newBalance } });

        // Create transaction record
        transactionId = generateCustomTransactionId("BDDY", 10);
        await new Transaction({
          transactionId,
          transactionType: "group_session_booking",
          closingBal: newBalance,
          debitAmt: price,
          walletId: wallet._id,
          userId: user._id,
          status: "success",
        }).save();

        // Notify admin/payment system
        await PaymentNotificationService.sendPaymentNotification({
          userId: user._id.toString(),
          userName: `${user.name?.firstName || ''} ${user.name?.lastName || ''}`.trim(),
          userEmail: user.email,
          amount: price,
          transactionId: transactionId,
          paymentId: transactionId,
          status: "success",
          transactionType: "group_session_booking",
          timestamp: new Date(),
          mentorId: session.mentorId?.toString?.() || String(session.mentorId),
          sessionType: session.sessionType,
        });

        // Credit mentor wallet with shares
        const totalAmount = price;
        const mentorShare = totalAmount * 0.7;
        const adminShare = totalAmount * 0.3;
        await MentorWallet.create({
          userId: user._id,
          mentorId: session.mentorId,
          amount: totalAmount,
          mentorShare,
          adminShare,
          type: "credit",
          status: "confirmed",
          description: "User booked a group session",
          sessionDetails: {
            duration: undefined,
            callType: session.sessionType,
            sessionDate: session.scheduledAt,
            sessionTime: moment(session.scheduledAt).format("hh:mm A"),
            bookingType: "instant",
          },
        });
      } else {
        // Load user for emails if not paid
        user = await User.findById(userId);
      }

      // Book user into session
      session.bookedUsers = session.bookedUsers || [];
      session.bookedUsers.push(userId as any);
      await session.save();

      // Send confirmation emails (non-blocking)
      try {
        const mentor = await Mentor.findById(session.mentorId);
        let mentorEmail = mentor?.contact?.email;
        let mentorName = mentor ? `${mentor.name?.firstName || ''} ${mentor.name?.lastName || ''}`.trim() : "Mentor";
        if (!mentorEmail) {
          const mentorUser = await User.findById(session.mentorId);
          mentorEmail = mentorUser?.email;
          mentorName = mentorUser ? `${mentorUser.name?.firstName || ''} ${mentorUser.name?.lastName || ''}`.trim() : mentorName;
        }

        const scheduledDateStr = moment(session.scheduledAt).format("LLL");
        const joinURL = session.joinLink || session.shareableLink || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/group-session/join/${session.roomId}`;

        if (user?.email) {
          const userMail = {
            from: process.env.SMTP_FROM,
            to: user.email,
            subject: "Group Session Booking Confirmed",
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h2>Your Group Session is Confirmed</h2>
                <p>Hi ${user.name?.firstName || 'there'},</p>
                <p>Your booking for <strong>${session.title}</strong> is confirmed.</p>
                <p><strong>When:</strong> ${scheduledDateStr}</p>
                <p><strong>Type:</strong> ${session.sessionType}</p>
                <p><strong>Join Link:</strong> <a href="${joinURL}">${joinURL}</a></p>
                ${price > 0 ? `<p><strong>Payment:</strong> ${price} BuddyCoins (Transaction: ${transactionId})</p>` : ''}
                <p>See you there!</p>
              </div>
            `,
          };
          // Fire and forget
          MailSender.sendMail(userMail).catch(() => {});
        }

        if (mentorEmail) {
          const mentorMail = {
            from: process.env.SMTP_FROM,
            to: mentorEmail,
            subject: "New Group Session Booking",
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h2>A user booked your group session</h2>
                <p>Hi ${mentorName},</p>
                <p><strong>${user?.name?.firstName || 'A user'}</strong> booked <strong>${session.title}</strong>.</p>
                <p><strong>When:</strong> ${scheduledDateStr}</p>
                <p><strong>Type:</strong> ${session.sessionType}</p>
                <p><strong>Join Link:</strong> <a href="${joinURL}">${joinURL}</a></p>
                ${price > 0 ? `<p><strong>Amount:</strong> ${price} BuddyCoins (Mentor Share: ${Math.round(price * 0.7)})</p>` : ''}
              </div>
            `,
          };
          MailSender.sendMail(mentorMail).catch(() => {});
        }
      } catch (emailErr) {
        // Do not fail booking on email error
        console.error("Email sending failed for group session:", (emailErr as any)?.message || emailErr);
      }

      return Ok(res, {
        message: "Group session booked successfully",
        session,
        payment: price > 0 ? { amount: price, transactionId } : null,
        joinLink: session.joinLink || session.shareableLink,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdateGroupSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await GroupSession.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!updated) return UnAuthorized(res, "Session not found");

      return Ok(res, updated);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeleteGroupSession(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await GroupSession.findByIdAndDelete(id);
      if (!deleted) return UnAuthorized(res, "Session not found");

      return Ok(res, { message: "Session deleted successfully" });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetGroupSessionByRoomId(req: Request, res: Response) {
    try {
      const { roomId } = req.params;
      const session = await GroupSession.findOne({ roomId }).populate("categoryId bookedUsers mentorId");
      
      if (!session) return UnAuthorized(res, "Session not found");
      
      return Ok(res, session);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetAllGroupSessions(req: Request, res: Response) {
    try {
      const sessions = await GroupSession.find({ 
        status: "scheduled",
        mentorId: { $ne: null }, // Exclude sessions with null mentorId
        categoryId: { $ne: null } // Exclude sessions with null categoryId
      })
        .populate("categoryId bookedUsers mentorId")
        .sort({ scheduledAt: 1 });
      
      return Ok(res, sessions);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
