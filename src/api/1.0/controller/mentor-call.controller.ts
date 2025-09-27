import { Request, Response } from "express";
import {
  IControllerRoutes,
  IController,
  IMentorCallScheduleProps,
  ISlotProps,
} from "../../../interface";
import { AuthForMentor, AuthForUser } from "../../../middleware";
import { BuddyCoins, CallSchedule, Chat, Mentor, Packages, User, Transaction } from "../../../model";
import { SessionPackage } from "../../../model/session-package.model";
import { Ok, UnAuthorized, getTokenFromHeader, verifyToken } from "../../../utils";
import moment from "moment-timezone";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { WalletController } from "./wallet.controller";
import { PaymentNotificationService } from "../../../services/payment-notification.service";
import axios from "axios";
import { MentorWallet } from "../../../model/mentor-wallet.model";

function generateRandomRoomId(length = 12): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}
export class MentorCallSchedule implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/mentor/schedule/bulk-save",
      handler: this.MultiDaySchedule,
      method: "POST",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      path: "/mentor/schedule",
      handler: this.CreateCallSchedule,
      method: "POST",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetMyCallSchedule,
      method: "GET",
      path: "/mentor/schedule",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.DeleteSlotAsMentorById,
      method: "DELETE",
      path: "/mentor/schedule/:slotId",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetSlotByMentorId,
      method: "GET",
      path: "/mentor/schedule/get/:mentorId",
    });
    this.routes.push({
      handler: this.BookSlotByUserId,
      method: "PUT",
      path: "/slot/book",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetAllSlots,
      method: "GET",
      path: "/all-slots",
    });
    this.routes.push({
      handler: this.ConfirmSlotByMentor,
      method: "PUT",
      path: "/confirm-slot",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.CancelSlotByMentor,
      method: "PUT",
      path: "/cancel-slot",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetMyCalls,
      method: "GET",
      path: "/mentor/calls",
    });
    this.routes.push({
      handler: this.GetUserCalls,
      method: "GET",
      path: "/user/calls",
      middleware:[AuthForUser]
    });

    this.routes.push({
      handler: this.GetCallRecording,
      method: "GET",
      path: "/call/recording/:callId",
      middleware: [AuthForUser]
    });

    this.routes.push({
      handler: this.JoinSession,
      method: "POST",
      path: "/session/join",
      middleware: [],
    });

    this.routes.push({
      handler: this.UpdateSlot,
      method: "PUT",
      path: "/mentor/slot/:slotId",
      middleware: [AuthForMentor],
    });
    // Add missing routes that tests expect
    this.routes.push({
      handler: this.BookSlotByUserId,
      method: "POST",
      path: "/mentor/book-slot",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetSlotByMentorId,
      method: "GET",
      path: "/mentor/slots/:mentorId",
    });
  }

  public async GetAllSlots(req: Request, res: Response) {
    try {
      const slots = await CallSchedule.find();
      return Ok(res, slots);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMyCalls(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const calls = await Chat.find({ "users.mentor": id.id })
        .populate("users.mentor")
        .populate("users.user")
        .populate("packageId");
      return Ok(res, calls);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

   public async GetUserCalls(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const calls = await Chat.find({ "users.user": id.id })
        .sort({ createdAt: -1 })
        .populate("users.mentor")
        .populate("users.user")
        .populate("packageId");
      return Ok(res, calls);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetCallRecording(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const userId = verifyToken(token);
      const { callId } = req.params;

      // Find the call and verify user has access to it
      const call = await Chat.findOne({
        _id: callId,
        $or: [
          { "users.user": userId.id },
          { "users.mentor": userId.id }
        ]
      });

      if (!call) {
        return UnAuthorized(res, "Call not found or access denied");
      }

      // Check if recording exists
      if (!call.sessionDetails?.recordingUrl) {
        return UnAuthorized(res, "Recording not available for this call");
      }

      // If recording is still processing, check status with 100ms
      if (call.sessionDetails.recordingStatus === "processing") {
        try {
          const recordingResponse = await axios.get(
            `https://api.100ms.live/v2/recordings/${call.sessionDetails.recordingId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              },
            }
          );

          // Update recording status and URL if completed
          if (recordingResponse.data.status === "completed") {
            await Chat.updateOne(
              { _id: callId },
              {
                $set: {
                  "sessionDetails.recordingStatus": "completed",
                  "sessionDetails.recordingUrl": recordingResponse.data.recording_url,
                },
              }
            );
            
            return Ok(res, {
              recordingUrl: recordingResponse.data.recording_url,
              status: "completed"
            });
          }
        } catch (error) {
          console.error("Error fetching recording from 100ms:", error);
        }
      }

      return Ok(res, {
        recordingUrl: call.sessionDetails.recordingUrl,
        status: call.sessionDetails.recordingStatus || "completed"
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async MultiDaySchedule(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const props: { time: string[]; slotsDate: string }[] = req.body;

      CallSchedule.insertMany(props);
      return Ok(res, "slots uploaded");
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async CreateCallSchedule(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);
      const { slots, slotsDate }: IMentorCallScheduleProps = req.body;

      if (!slots) {
        return UnAuthorized(res, "missing time slots");
      }

      // Find if a schedule already exists for the provided date
      const existedSlotDate = await CallSchedule.findOne({
        mentorId: id.id,
        slotsDate,
      });

      if (existedSlotDate) {
        // Use updateOne with $addToSet to add new slots without duplicates
        await CallSchedule.updateOne(
          { mentorId: id.id, slotsDate },
          { $addToSet: { slots: { $each: slots } } } // Add only unique slots
        );

        return Ok(res, `New slots for ${slotsDate} have been added`);
      }

      // If no slots exist for the date, create a new schedule
      const slot = await new CallSchedule({
        mentorId: id.id,
        slotsDate: slotsDate,
        slots,
      }).save();

      return Ok(res, `slots are uploaded for ${slot.slotsDate}`);
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async DeleteSlotAsMentorById(req: Request, res: Response) {
    try {
      const slotId = req.params.slotId;
      const slot = await CallSchedule.findByIdAndDelete({
        _id: slotId,
      });
      return Ok(res, `Slot deleted!`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMyCallSchedule(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const mentorId = verifyToken(token);
      const slots = await CallSchedule.find({ mentorId: mentorId.id })
        .sort({ updatedAt: -1 })
        .populate(
          "mentorId",
          "accountStatus category subCategory specialists name email online block verified"
        )
        .populate("slots.userId", "name online block verified email");
      return Ok(res, slots);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetSlotByMentorId(req: Request, res: Response) {
    try {
      const mentorId = req.params.mentorId;
      const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

      const slots = await CallSchedule.find({
        mentorId: mentorId,
        slotsDate: { $gte: today },
      }).populate("slots.userId");
      console.log('Today date:', today);
      console.log('Found slots:', slots);
      return Ok(res, slots);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async BookSlotByUserId(req: Request, res: Response) {
    console.log('=== BOOK SLOT DEBUG START ===');
    console.log('Request body:', req.body);
    console.log('Request user:', (req as any).user);
    try {
      const { slotId, mentorId, callType, time, type, packageId } = req.body;
      const userId = (req as any).user.id; // Get authenticated user ID from middleware
      
      console.log('Extracted values:', { slotId, mentorId, callType, time, type, userId });
      
      if (!mentorId || !callType || !time || !type) {
        console.log('Missing required fields:', { mentorId: !!mentorId, callType: !!callType, time: !!time, type: !!type });
        return UnAuthorized(res, "not valid configs found");
      }
      if (type === "slot" && !slotId) {
        console.log('Slot ID missing for slot type booking');
        return UnAuthorized(res, "Slot ID is required for booking a slot.");
      }

      console.log('Looking for user and mentor...');
      const user = await User.findById(userId).lean();
      const mentor = await Mentor.findById(mentorId).lean();
      console.log('User found:', !!user, 'Mentor found:', !!mentor);
      if (!user || !mentor) {
        console.log('User or mentor not found - returning 401');
        return UnAuthorized(res, "User or Mentor not found.");
      }

      // Check if using session package or regular pricing
      let sessionPackage = null;
      let totalCost = 0;
      let paymentMethod = 'wallet';
      let transactionId = null;
      
      if (packageId) {
        console.log('DEBUG: Looking for session package with ID:', packageId);
        sessionPackage = await SessionPackage.findById(packageId);
        
        if (!sessionPackage) {
          return UnAuthorized(res, "Session package not found.");
        }
        
        if (sessionPackage.userId.toString() !== userId) {
          return UnAuthorized(res, "Session package does not belong to user.");
        }
        
        if (sessionPackage.type !== callType) {
          return UnAuthorized(res, `Session package is for ${sessionPackage.type} sessions, not ${callType}.`);
        }
        
        if (sessionPackage.remainingSessions <= 0) {
          return UnAuthorized(res, "No remaining sessions in package.");
        }
        
        if (sessionPackage.status !== 'active') {
          return UnAuthorized(res, "Session package is not active.");
        }
        
        // Implement no-charge logic for mutual discussion sessions until last session
        const isLastSession = sessionPackage.remainingSessions === 1;
        
        // Use session from package
        sessionPackage.remainingSessions -= 1;
        if (sessionPackage.remainingSessions === 0) {
          sessionPackage.status = 'expired';
        }
        await sessionPackage.save();
        
        if (isLastSession) {
          // Last session: Apply normal charging logic
          console.log('DEBUG: Last session in package - applying charges');
          const packages = await Packages.findOne({
            packageType: callType,
            mentorId: mentor._id,
          }).lean();
          
          const userWallet = await BuddyCoins.findOne({ userId }).lean();
          
          if (!packages || !userWallet) {
            return UnAuthorized(res, "Package or Wallet not found for last session payment.");
          }

          totalCost = packages.price * parseInt(time);
          const slotBalance = userWallet.balance - totalCost;
          if (slotBalance < 0) {
            return UnAuthorized(res, "Insufficient balance for last session.");
          }

          // Update wallet balance and create transaction record
          await BuddyCoins.updateOne({ userId }, { balance: slotBalance });
          
          // Create wallet transaction record
          transactionId = `SLOT-${Date.now()}`;
          await new Transaction({
            transactionId,
            transactionType: 'session_booking',
            closingBal: slotBalance,
            debitAmt: totalCost,
            walletId: userWallet._id,
            userId: user._id,
            status: 'success',
          }).save();
          
          // Send payment notification for last session booking
          await PaymentNotificationService.sendPaymentNotification({
            userId: user._id.toString(),
            userName: `${user.name.firstName} ${user.name.lastName}`,
            userEmail: user.email,
            amount: totalCost,
            transactionId,
            paymentId: `BOOKING-${slotId || Date.now()}`,
            status: 'success',
            transactionType: 'session_booking',
            timestamp: new Date()
          });
          
          paymentMethod = 'wallet';
          
          // Create 1-week chat support after last package session
          console.log('DEBUG: Creating 1-week chat support after last package session');
          try {
            const supportStartTime = new Date();
            const supportEndTime = new Date(supportStartTime.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
            const supportRoomId = generateRandomRoomId();
            const frontendUrl = process.env.FRONTEND_URL || "https://alterbuddy.com";
            const supportChatUrl = `${frontendUrl}/user/chat/${mentor._id}/${supportRoomId}`;
            
            const chatSupportData = {
              users: {
                user: userId,
                mentor: mentorId,
              },
              sessionDetails: {
                roomId: supportRoomId,
                roomCode: {
                  host: undefined,
                  mentor: undefined,
                },
                roomName: `Package-Support-${Date.now()}`,
                callType: 'chat',
                duration: '10080', // 7 days in minutes (7 * 24 * 60)
                startTime: supportStartTime.toISOString(),
                endTime: supportEndTime.toISOString(),
                recordingId: null,
                recordingUrl: null,
              },
              status: "ACTIVE",
              packageId: sessionPackage._id,
              isSupportSession: true,
              supportExpiryDate: supportEndTime,
              originalPackageId: sessionPackage._id
            };
            
            try {
              const createdSession = await Chat.create(chatSupportData);
              console.log('DEBUG: 1-week chat support session created successfully', createdSession._id);
            } catch (error) {
              console.error('DEBUG: Error creating chat support session:', error);
              throw error;
            }
            
            // Send notification email about chat support availability
            const supportEmailOptions = {
              from: process.env.SMTP_FROM,
              to: user.email,
              subject: "🎉 Your Package is Complete + 1 Week Free Chat Support!",
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Package Complete - Chat Support Available</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 20px;
                      }
                      .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                      }
                      .email-header {
                        text-align: center;
                        background-color: #4caf50;
                        padding: 20px;
                        color: #ffffff;
                        border-radius: 5px 5px 0 0;
                      }
                      .email-body {
                        padding: 20px;
                        color: #333333;
                      }
                      .support-button {
                        display: inline-block;
                        padding: 15px 25px;
                        background-color: #2196F3;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                      }
                      .support-button:hover {
                        background-color: #1976D2;
                      }
                      .email-footer {
                        text-align: center;
                        font-size: 12px;
                        color: #999999;
                        margin-top: 20px;
                      }
                      .highlight {
                        background-color: #fff3cd;
                        padding: 15px;
                        border-radius: 5px;
                        border-left: 4px solid #ffc107;
                        margin: 15px 0;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="email-container">
                      <div class="email-header">
                        <h1>🎉 Package Complete!</h1>
                      </div>
                      <div class="email-body">
                        <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
                        <p>Congratulations! You have successfully completed your session package with <strong>${mentor.name.firstName} ${mentor.name.lastName}</strong>.</p>
                        
                        <div class="highlight">
                          <h3>🎁 Bonus: 1 Week Free Chat Support!</h3>
                          <p>As a thank you for completing your package, you now have <strong>1 week of free chat support</strong> with your mentor.</p>
                          <p><strong>Available until:</strong> ${supportEndTime.toLocaleDateString()} at ${supportEndTime.toLocaleTimeString()}</p>
                        </div>
                        
                        <p>You can use this chat support for:</p>
                        <ul>
                          <li>Follow-up questions about your sessions</li>
                          <li>Quick clarifications and guidance</li>
                          <li>Continued support on your journey</li>
                        </ul>
                        
                        <p style="text-align: center;">
                          <a href="${supportChatUrl}" class="support-button">Start Chat Support</a>
                        </p>
                        
                        <p>Thank you for choosing Alter Buddy for your mentorship journey!</p>
                      </div>
                      <div class="email-footer">
                        <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            };
            
            // Send support notification email asynchronously
             const sendSupportEmail = async () => {
               try {
                 const transporter = nodemailer.createTransport({
                   host: process.env.SMTP_HOST,
                   port: 587,
                   secure: false,
                   auth: {
                     user: process.env.SMTP_USER,
                     pass: process.env.SMTP_PASS,
                   },
                   tls: { rejectUnauthorized: true },
                 });
                 await transporter.sendMail(supportEmailOptions);
                 console.log('DEBUG: Chat support notification email sent successfully');
               } catch (emailError) {
                 console.error('Failed to send chat support notification email:', emailError);
               }
             };
            
            // Send email asynchronously without waiting
            sendSupportEmail();
            
          } catch (supportError) {
            console.error('Failed to create 1-week chat support:', supportError);
            // Don't fail the main booking process if support creation fails
          }
        } else {
          // Mutual discussion sessions (all except last): No charge
          console.log('DEBUG: Mutual discussion session - no charge applied');
          totalCost = 0;
          paymentMethod = 'package';
        }
        
        console.log('DEBUG: Used session from package, remaining:', sessionPackage.remainingSessions, 'isLastSession:', isLastSession);
      } else {
        // Regular wallet-based payment
        console.log('DEBUG: Looking for regular package with:', { packageType: callType, mentorId: mentor._id });
        const packages = await Packages.findOne({
          packageType: callType,
          mentorId: mentor._id,
        }).lean();
        console.log('DEBUG: Found package:', packages);
        
        const userWallet = await BuddyCoins.findOne({ userId }).lean();
        console.log('DEBUG: Found wallet:', userWallet ? { balance: userWallet.balance } : null);
        
        if (!packages || !userWallet) {
          console.log('DEBUG: Missing package or wallet:', { hasPackage: !!packages, hasWallet: !!userWallet });
          return UnAuthorized(res, "Package or Wallet not found.");
        }

        totalCost = packages.price * parseInt(time);
        const slotBalance = userWallet.balance - totalCost;
        if (slotBalance < 0) {
          return UnAuthorized(res, "Insufficient balance.");
        }

        // Update wallet balance and create transaction record
        await BuddyCoins.updateOne({ userId }, { balance: slotBalance });
        
        // Create wallet transaction record
         transactionId = `SLOT-${Date.now()}`;
         await new Transaction({
           transactionId,
           transactionType: 'session_booking',
           closingBal: slotBalance,
           debitAmt: totalCost,
           walletId: userWallet._id,
           userId: user._id,
           status: 'success',
         }).save();
         
         // Send payment notification for session booking
         await PaymentNotificationService.sendPaymentNotification({
           userId: user._id.toString(),
           userName: `${user.name.firstName} ${user.name.lastName}`,
           userEmail: user.email,
           amount: totalCost,
           transactionId,
           paymentId: `BOOKING-${slotId || Date.now()}`,
           status: 'success',
           transactionType: 'session_booking',
           timestamp: new Date()
         });
      }

      if (type === "slot") {
        await CallSchedule.updateOne(
          { slots: { $elemMatch: { _id: slotId } } },
          {
            $set: {
              "slots.$.booked": true,
              "slots.$.userId": userId,
              "slots.$.status": "pending",
              "slots.$.callType": callType,
              "slots.$.duration": time,
            },
          }
        );
      }

      let hostJoinURL: string | undefined;
      let guestJoinURL: string | undefined;
      let roomId: string = generateRandomRoomId();

      if (callType === "audio" || callType === "video") {
        const roomResponse = await axios.post(
          "https://api.100ms.live/v2/rooms",
          {
            name: `slot-booking-${Date.now()}`,
            description: "Mentorship Session",
            template_id:
              callType === "video"
                ? process.env.REACT_APP_100MD_SDK_VIDEO_TEMPLATE
                : process.env.REACT_APP_100MD_SDK_AUDIO_TEMPLATE,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        roomId = roomResponse.data.id || roomId;

        const [hostCodeRes, guestCodeRes] = await Promise.all([
          axios.post(
            `https://api.100ms.live/v2/room-codes/room/${roomId}/role/host`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              },
            }
          ),
          axios.post(
            `https://api.100ms.live/v2/room-codes/room/${roomId}/role/guest`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
              },
            }
          ),
        ]);

        const baseURL =
          callType === "video"
            ? process.env.REACT_APP_100MD_SDK_VIDEO_URL
            : process.env.REACT_APP_100MD_SDK_AUDIO_URL;

        hostJoinURL = `https://${baseURL}.app.100ms.live/meeting/${hostCodeRes.data.code}`;
        guestJoinURL = `https://${baseURL}.app.100ms.live/meeting/${guestCodeRes.data.code}`;
      } else {
        const frontendUrl = process.env.FRONTEND_URL || "https://alterbuddy.com";
        guestJoinURL = `${frontendUrl}/user/chat/${mentor._id}/${roomId}`;
        hostJoinURL = `${frontendUrl}/user/chat/${mentor._id}/${roomId}`;
      }
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseInt(time) * 60000); // Add minutes in milliseconds

      // Create mentor wallet transaction only when there's actual payment (totalCost > 0)
      if (totalCost > 0) {
        const totalAmount = totalCost;
        const mentorShare = totalAmount * 0.7;
        const adminShare = totalAmount * 0.3;

        await MentorWallet.create({
          userId,
          mentorId,
          slotId: type === "slot" ? slotId : undefined,
          amount: totalAmount,
          mentorShare,
          adminShare,
          type: "credit", // Changed to credit since mentor receives payment
          status: "confirmed",
          description: packageId ? "User booked final package session" : "User booked a mentor session",
          sessionDetails: {
            duration: parseInt(time),
            callType: callType,
            sessionDate: startTime,
            sessionTime: moment(startTime).format("hh:mm A"),
            bookingType: type === "slot" ? "slot" : "instant",
          },
        });
      }

      if (type != "slot") {
        const chatData: any = {
          users: {
            user: userId,
            mentor: mentorId,
          },
          sessionDetails: {
            roomId,
            roomCode: {
              host: hostJoinURL ? hostJoinURL.split("/").pop() : undefined,
              mentor: guestJoinURL ? guestJoinURL.split("/").pop() : undefined,
            },
            roomName: `Session-${Date.now()}`,
            callType,
            duration: parseInt(time).toString(), // Store as string number for consistency
            startTime,
            endTime,
            recordingId: null,
            recordingUrl: null,
          },
          status: "PENDING",
        };
        
        // Add packageId if this is a package session
        if (packageId) {
          chatData.packageId = packageId;
        }
        
        await Chat.create(chatData);

        // Send emails asynchronously without blocking the booking process
        const sendEmails = async () => {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: 587,
              secure: false,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
              tls: { rejectUnauthorized: true },
            });

            // --- Send Email to USER ---
            const userMailOptions = {
              from: process.env.SMTP_FROM,
              to: user.email,
              subject: "Your Mentor Slot Has Been Confirmed!",
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Slot Confirmation</title>
                    <style>
                      body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f4;
                        margin: 0;
                        padding: 20px;
                      }
                      .email-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        padding: 20px;
                        border-radius: 5px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                      }
                      .email-header {
                        text-align: center;
                        background-color: #4caf50;
                        padding: 20px;
                        color: #ffffff;
                        border-radius: 5px 5px 0 0;
                      }
                      .email-body {
                        padding: 20px;
                        color: #333333;
                      }
                      .join-button {
                        display: inline-block;
                        padding: 15px 25px;
                        background-color: #4caf50;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                      }
                      .join-button:hover {
                        background-color: #45a049;
                      }
                      .email-footer {
                        text-align: center;
                        font-size: 12px;
                        color: #999999;
                        margin-top: 20px;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="email-container">
                      <div class="email-header">
                        <h1>Slot Confirmation</h1>
                      </div>
                      <div class="email-body">
                        <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
                        <p>Your mentor <strong>${mentor.name.firstName} ${mentor.name.lastName}</strong> has confirmed your session!</p>
                        <p>Click below to join your session:</p>
                        <p style="text-align: center;">
                          <a href="${guestJoinURL}" class="join-button">Join Session</a>
                        </p>
                        <p>If you have any questions, please contact support.</p>
                        <p>Thank you!</p>
                      </div>
                      <div class="email-footer">
                        <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                      </div>
                    </div>
                  </body>
                </html>
              `,
            };
            await transporter.sendMail(userMailOptions);

            // --- Send Email to MENTOR ---
            const mentorMailOptions = {
              from: process.env.SMTP_FROM,
              to: mentor.contact.email,
              subject: "New Mentorship Session Booked!",
              html: `
                <!DOCTYPE html>
                  <html>
                  <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Slot Confirmation</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f4f4;
                      margin: 0;
                      padding: 20px;
                    }
                    .email-container {
                      max-width: 600px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      padding: 20px;
                      border-radius: 5px;
                      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .email-header {
                      text-align: center;
                      background-color: #4caf50;
                      padding: 20px;
                      color: #ffffff;
                      border-radius: 5px 5px 0 0;
                    }
                    .email-body {
                      padding: 20px;
                      color: #333333;
                    }
                    .join-button {
                      display: inline-block;
                      padding: 15px 25px;
                      background-color: #4caf50;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 5px;
                      margin: 20px 0;
                    }
                    .join-button:hover {
                      background-color: #45a049;
                    }
                    .email-footer {
                      text-align: center;
                      font-size: 12px;
                      color: #999999;
                      margin-top: 20px;
                    }
                  </style>
                </head>
                <body>
                  <div class="email-container">
                    <div class="email-header">
                      <h1>Slot Confirmation</h1>
                    </div>
                    <div class="email-body">
                      <p>Hi ${mentor.name.firstName} ${mentor.name.lastName},</p>
                      <p>A new mentorship session has been booked by <strong>${user.name.firstName} ${user.name.lastName}</strong>.</p>
                      <p>Click below to join the session:</p>
                      <p style="text-align: center;" >
                        <a href="${hostJoinURL}" class="join-button" style="background: #45a049; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Join as Mentor</a>
                      </p>
                      <p>If you have any issues, feel free to contact support.</p>
                      <p>Thank you!</p>
                    </div>
                    <div class="email-footer">
                      <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                    </div>
                  </div>
                </body>
                </html>`,
            };
            await transporter.sendMail(mentorMailOptions);
          } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Don't throw the error - just log it
          }
        };
        
        // Send emails asynchronously without waiting
        sendEmails();
      }

      return Ok(res, {
        message: `Hey! ${user.name.firstName} ${user.name.lastName}, your slot is booked with ${mentor.name.firstName} ${mentor.name.lastName}`,
        link: guestJoinURL,
        payment: {
          amount: totalCost,
          transactionId: transactionId || `BOOKING-${Date.now()}`,
          paymentId: `BOOKING-${slotId || Date.now()}`,
          status: 'success'
        }
      });
    } catch (err) {
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Unknown error occurred."
      );
    }
  }

  public async UpdateSlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      if (!slotId) {
        return UnAuthorized(res, "failed to update");
      } else {
        const updated = await CallSchedule.findOneAndUpdate(
          {
            slots: {
              $elemMatch: {
                _id: new mongoose.Types.ObjectId(slotId),
              },
            },
          },
          {
            $set: {
              "slots.$.note": req.body.note,
            } as Partial<IMentorCallScheduleProps>,
          },
          { new: true }
        );
        return Ok(res, "slot updated");
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async ConfirmSlotByMentor(req: Request, res: Response) {
    try {
      const { slotId, mentorId, userId } = req.body;
      if (!slotId || !mentorId || !userId) {
        return UnAuthorized(res, "Not valid configs found");
      }

      const user = await User.findById(userId).lean();
      const mentor = await Mentor.findById(mentorId).lean();
      const slotData = await CallSchedule.findOne({
        slots: { $elemMatch: { _id: slotId } },
      }).lean();

      if (!user || !mentor || !slotData) {
        return UnAuthorized(res, "User, Mentor, or Slot not found.");
      }
      const slot = slotData.slots.find((s) => String(s._id) === slotId);
      if (!slot) {
        return UnAuthorized(res, "Slot not found in CallSchedule.");
      }
      let hostJoinURL: string | undefined;
      let guestJoinURL: string | undefined;
      let roomId: string = generateRandomRoomId();

      const startTime = moment(
        `${slotData.slotsDate} ${slot.time}`,
        "YYYY-MM-DD hh:mm A"
      );

      const packages = await Packages.findOne({
        packageType: slot?.callType,
        mentorId: mentor._id,
      }).lean();

      const totalAmount = slot.duration * packages.price;
      const mentorShare = totalAmount * 0.7;
      const adminShare = totalAmount * 0.3;

      await MentorWallet.create({
        userId,
        mentorId,
        slotId,
        amount: totalAmount,
        mentorShare,
        adminShare,
        type: "credit",
        status: "confirmed",
        description: "Mentor confirmed session",
        sessionDetails: {
          duration: slot.duration,
          callType: slot.callType,
          sessionDate: startTime.toDate(),
          sessionTime: startTime.format("hh:mm A"),
          bookingType: "slot",
        },
      });

      // Step 2: Create endTime
      const roomResponse = await axios.post(
        "https://api.100ms.live/v2/rooms",
        {
          name: `slot-booking-${Date.now()}`,
          description: "Mentorship Session",
          template_id:
            slot.callType === "video"
              ? process.env.REACT_APP_100MD_SDK_VIDEO_TEMPLATE
              : process.env.REACT_APP_100MD_SDK_AUDIO_TEMPLATE,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      roomId = roomResponse.data.id || roomId;

      const [hostCodeRes, guestCodeRes] = await Promise.all([
        axios.post(
          `https://api.100ms.live/v2/room-codes/room/${roomId}/role/host`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
            },
          }
        ),
        axios.post(
          `https://api.100ms.live/v2/room-codes/room/${roomId}/role/guest`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
            },
          }
        ),
      ]);

      const baseURL =
        slot.callType === "video"
          ? process.env.REACT_APP_100MD_SDK_VIDEO_URL
          : process.env.REACT_APP_100MD_SDK_AUDIO_URL;

      hostJoinURL = `https://${baseURL}.app.100ms.live/meeting/${hostCodeRes.data.code}`;
      guestJoinURL = `https://${baseURL}.app.100ms.live/meeting/${guestCodeRes.data.code}`;
      const endTime = startTime.clone().add(slot.duration, "minutes");

      await Chat.create({
        users: {
          user: userId,
          mentor: mentorId,
        },
        sessionDetails: {
          roomId,
          roomCode: {
            host: hostJoinURL ? hostJoinURL.split("/").pop() : undefined,
            mentor: guestJoinURL ? guestJoinURL.split("/").pop() : undefined,
          },
          roomName: `Session-${Date.now()}`,
          callType: slot.callType,
          duration: slot.duration.toString(), // Store as string number for consistency
          startTime,
          endTime,
          recordingId: null,
          recordingUrl: null,
          recordingStatus: 'pending',
        },
        status: "PENDING",
      });

      const formattedDate = startTime.format("dddd, MMMM Do YYYY"); // e.g. Monday, June 10th 2025
      const formattedTime = startTime.format("hh:mm A"); // e.g. 04:00 PM
      const formattedDuration = `${slot.duration} minutes`; // e.g. 30 minutes

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: true },
      });

      // --- Send Email to USER ---

      const userMailOptions = {
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: "Your Mentor Slot Has Been Confirmed!",
        html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Session Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 30px auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #4caf50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            margin: 20px 0;
            color: #333;
          }
          .join-button {
            display: block;
            width: fit-content;
            margin: 20px auto;
            padding: 15px 25px;
            background-color: #4caf50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Session Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name.firstName} ${user.name.lastName},</p>
            <p><strong>Your mentor ${mentor.name.firstName} ${mentor.name.lastName} has confirmed your session!</strong></p>
            <p>🗓 <strong>Date:</strong> ${formattedDate}</p>
            <p>⏰ <strong>Time:</strong> ${formattedTime}</p>
            <p>⏳ <strong>Duration:</strong> ${formattedDuration}</p>
            <a href="${guestJoinURL}" class="join-button">👉 Join Session</a>
            <p>Please join 5 minutes before your scheduled time. Being late may reduce your available session time.</p>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>©️ 2025 AlterBuddy. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `,
      };

      await transporter.sendMail(userMailOptions);

      // --- Send Email to MENTOR ---
      const mentorMailOptions = {
        from: process.env.SMTP_FROM,
        to: mentor.contact.email,
        subject: "New Mentorship Session Booked!",
        html: `
            <!DOCTYPE html>
              <html>
              <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Slot Confirmation</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
                }
                .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border-radius: 5px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .email-header {
                  text-align: center;
                  background-color: #4caf50;
                  padding: 20px;
                  color: #ffffff;
                  border-radius: 5px 5px 0 0;
                }
                .email-body {
                  padding: 20px;
                  color: #333333;
                }
                .join-button {
                  display: inline-block;
                  padding: 15px 25px;
                  background-color: #4caf50;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                }
                .join-button:hover {
                  background-color: #45a049;
                }
                .email-footer {
                  text-align: center;
                  font-size: 12px;
                  color: #999999;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <h1>Slot Confirmation</h1>
                </div>
                <div class="email-body">
                  <p>Hi ${mentor.name.firstName} ${mentor.name.lastName},</p>
                  <p>A new mentorship session has been booked by <strong>${user.name.firstName} ${user.name.lastName}</strong>.</p>
                  <p>Click below to join the session:</p>
                  <p style="text-align: center;" >
                    <a href="${hostJoinURL}" class="join-button" style="background: #45a049; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Join as Mentor</a>
                  </p>
                  <p>If you have any issues, feel free to contact support.</p>
                  <p>Thank you!</p>
                </div>
                <div class="email-footer">
                  <p>&copy; 2025 Alter Buddy. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>`,
      };
      await transporter.sendMail(mentorMailOptions);

      // === Update Slot Status ===
      await CallSchedule.updateOne(
        { "slots._id": slotId },
        { $set: { "slots.$.status": "accepted" } }
      );

      return Ok(res, `Slot confirmed and chat created successfully`);
    } catch (err) {
      console.error("ConfirmSlotByMentor Error:", err);
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Unknown error occurred."
      );
    }
  }

  public async CancelSlotByMentor(req: Request, res: Response) {
    try {
      const schedule = await CallSchedule.findOne({
        "slots._id": req.body,
      });
      const slot = await CallSchedule.findOneAndUpdate(
        {
          "slots._id": req.body,
        },
        {
          $set: {
            "slots.$.status": "rejected",
            "slots.$.booked": false,
          },
          $unset: {
            "slots.$.userId": "", // Unsetting userId properly
          },
        },
        { new: true }
      );
      return Ok(res, `Slot rejected`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async JoinSession(req: Request, res: Response) {
    try {
      const { sessionId, userType, userId } = req.body;
      
      if (!sessionId || !userType || !userId) {
        return UnAuthorized(res, "Missing required fields: sessionId, userType, userId");
      }

      // Find the chat session
      const session = await Chat.findById(sessionId);
      if (!session) {
        return UnAuthorized(res, "Session not found");
      }

      // Verify user has access to this session
      const hasAccess = 
        (userType === 'user' && session.users.user.toString() === userId) ||
        (userType === 'mentor' && session.users.mentor.toString() === userId);
      
      if (!hasAccess) {
        return UnAuthorized(res, "Access denied to this session");
      }

      // Update join tracking
       const updateField = userType === 'user' ? 'sessionDetails.userJoined' : 'sessionDetails.mentorJoined';
       const joinTimeField = userType === 'user' ? 'sessionDetails.userJoinedAt' : 'sessionDetails.mentorJoinedAt';
       const joinTime = new Date();
       
       await Chat.updateOne(
         { _id: sessionId },
         { 
           $set: { 
             [updateField]: true,
             [joinTimeField]: joinTime,
             status: 'ACTIVE'
           } 
         }
       );

       // Get updated session to check if both parties have joined
       const updatedSession = await Chat.findById(sessionId);
       
       // Start timer logic based on session type
       if (updatedSession) {
         await this.checkAndStartSessionTimer(updatedSession);
       }

      // If this is the first person to join, start recording for video/audio calls
      if (session.sessionDetails?.callType !== 'chat' && !session.sessionDetails?.recordingId) {
        try {
          const recordingResponse = await axios.post(
            `https://api.100ms.live/v2/recordings/room/${session.sessionDetails.roomId}/start`,
            {
              meeting_url: `https://api.100ms.live/v2/rooms/${session.sessionDetails.roomId}`,
              resolution: {
                width: 1280,
                height: 720
              }
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_100MD_SDK_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (recordingResponse.data?.id) {
            await Chat.updateOne(
              { _id: sessionId },
              {
                $set: {
                  'sessionDetails.recordingId': recordingResponse.data.id,
                  'sessionDetails.recordingStatus': 'processing'
                }
              }
            );
          }
        } catch (recordingError) {
          console.error('Failed to start recording:', recordingError);
          // Don't fail the join if recording fails
        }
      }

      return Ok(res, {
         message: `${userType} joined session successfully`,
         joinTime,
         sessionStatus: 'ACTIVE'
       });
     } catch (err) {
       console.error('JoinSession error:', err);
       return UnAuthorized(res, err instanceof Error ? err.message : "Unknown error occurred");
     }
   }

   private async checkAndStartSessionTimer(session: any) {
     try {
       // For group sessions, timer should start immediately when session begins
       if (session.sessionDetails?.callType === 'group') {
         if (!session.sessionDetails?.timerStarted) {
           await this.startSessionTimer(session._id);
         }
         return;
       }

       // For 1-on-1 sessions, timer starts only when both mentor and user have joined
       const mentorJoined = session.sessionDetails?.mentorJoined || false;
       const userJoined = session.sessionDetails?.userJoined || false;

       if (mentorJoined && userJoined && !session.sessionDetails?.timerStarted) {
         await this.startSessionTimer(session._id);
       }
     } catch (error) {
       console.error('Error checking session timer:', error);
     }
   }

   private async startSessionTimer(sessionId: string) {
     try {
       const actualStartTime = new Date();
       
       await Chat.updateOne(
         { _id: sessionId },
         {
           $set: {
             'sessionDetails.timerStarted': true,
             'sessionDetails.actualStartTime': actualStartTime
           }
         }
       );

       console.log(`Session timer started for session ${sessionId} at ${actualStartTime}`);
     } catch (error) {
       console.error('Error starting session timer:', error);
     }
   }
 }
