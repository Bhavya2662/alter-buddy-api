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
      const mentorObjectId = new mongoose.Types.ObjectId(id.id);
      const calls = await Chat.find({ "users.mentor": mentorObjectId })
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
      const userObjectId = new mongoose.Types.ObjectId(id.id);
      const calls = await Chat.find({ "users.user": userObjectId })
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
      // Look for mentor in Mentor collection
      const mentor = await Mentor.findById(mentorId).lean();
      console.log('User found:', !!user, 'Mentor found:', !!mentor);
      console.log('Mentor acType:', mentor?.acType);
      if (!user || !mentor) {
        console.log('User or mentor not found - returning 401');
        return UnAuthorized(res, "User or Mentor not found.");
      }

      // Validate slot existence and availability when booking a specific slot
      if (type === "slot") {
        const slotData = await CallSchedule.findOne({
          mentorId: mentorId,
          slots: { $elemMatch: { _id: new mongoose.Types.ObjectId(slotId) } },
        }).lean();

        if (!slotData) {
          return UnAuthorized(res, "Slot not found.");
        }
        const slot = slotData.slots.find((s) => String(s._id) === String(slotId));
        if (!slot) {
          return UnAuthorized(res, "Slot not found.");
        }
        if (slot.booked) {
          return UnAuthorized(res, "Slot already booked or unavailable.");
        }
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
        
        console.log('DEBUG: Used session from package, remaining:', sessionPackage.remainingSessions, 'isLastSession:', isLastSession);
        console.log('DEBUG: Execution continuing after package usage log...');
        
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
          
          // Persist package changes (remainingSessions decrement and status)
          try {
            await sessionPackage.save();
            console.log('DEBUG: Last session package saved successfully');
          } catch (saveError) {
            console.log('DEBUG: Error saving session package on last session:', saveError);
            return UnAuthorized(res, 'Failed to update session package');
          }
          
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
            sendSupportEmail().catch(error => {
              console.error('Unhandled error in sendSupportEmail:', error);
            });
            
          } catch (supportError) {
            console.error('Failed to create 1-week chat support:', supportError);
            // Don't fail the main booking process if support creation fails
          }
        } else {
          // Mutual discussion sessions (all except last): No charge
          console.log('DEBUG: Mutual discussion session - no charge applied');
          totalCost = 0;
          paymentMethod = 'package';
        
        // Save the updated session package
        try {
          console.log('DEBUG: About to save session package...');
          await sessionPackage.save();
          console.log('DEBUG: Package saved successfully, proceeding to room creation');
        } catch (saveError) {
          console.log('DEBUG: Error saving session package:', saveError);
          return UnAuthorized(res, 'Failed to update session package');
        }
      }
      }
      else {
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

        // Check for first-time pricing (1 rupee for first chat session, regardless of duration)
        let isFirstTimeUser = false;
        if (callType === 'chat') {
          // Check for any previous debit transactions (indicating previous bookings)
          const existingTransactions = await Transaction.countDocuments({
            userId: userId,
            debitAmt: { $gt: 0 },
            status: 'success'
          });
          
          console.log('DEBUG: Existing debit transactions for user:', existingTransactions);
          isFirstTimeUser = existingTransactions === 0;
        }

        if (isFirstTimeUser) {
          totalCost = 1; // 1 rupee for first-time chat users (5 minutes or less)
          console.log('DEBUG: Applied first-time pricing: 1 rupee');
        } else {
          totalCost = packages.price * parseInt(time);
          console.log('DEBUG: Applied regular pricing:', totalCost);
        }
        const slotBalance = userWallet.balance - totalCost;
        if (slotBalance < 0) {
          return UnAuthorized(res, "Insufficient balance.");
        }
        
        console.log('DEBUG: Payment calculation - Cost:', totalCost, 'Balance after:', slotBalance, 'First-time user:', isFirstTimeUser);

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

      console.log("DEBUG: Finished payment processing, proceeding to slot booking...");
      if (type === "slot") {
        await CallSchedule.updateOne(
          { mentorId: mentorId, slots: { $elemMatch: { _id: slotId } } },
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
      const durationMinutes = parseInt(time);
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      let chat: any;

      console.log("DEBUG: About to start room creation process for callType:", callType);
      if (callType === "audio" || callType === "video") {
        try {
          console.log("=== 100MS API DEBUG START ===");
          console.log("Creating room for callType:", callType);
          console.log("Template ID:", callType === "video" ? process.env.REACT_APP_100MD_SDK_VIDEO_TEMPLATE : process.env.REACT_APP_100MD_SDK_AUDIO_TEMPLATE);
          console.log("Token present:", !!process.env.REACT_APP_100MD_SDK_TOKEN);
          console.log("About to make 100ms API call...");
          
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
          
          console.log("Room created successfully:", roomResponse.data.id);
          console.log("=== 100MS API DEBUG END ===");
  
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
  
          if (baseURL) {
            hostJoinURL = `https://${baseURL}.app.100ms.live/meeting/${hostCodeRes.data.code}`;
            guestJoinURL = `https://${baseURL}.app.100ms.live/meeting/${guestCodeRes.data.code}`;
          } else {
            // Fallback: generate local links if baseURL envs are not configured
            const frontendUrl = process.env.FRONTEND_URL || "https://alterbuddy.com";
            const basePath = callType === "video" ? "video" : "audio";
            hostJoinURL = `${frontendUrl}/user/${basePath}/${mentor._id}/${roomId}`;
            guestJoinURL = hostJoinURL;
          }
        } catch (roomErr) {
          console.error("100MS room creation failed:", roomErr?.response?.data || roomErr.message);
          // Fallback: generate local links so booking does not fail
          const frontendUrl = process.env.FRONTEND_URL || "https://alterbuddy.com";
          const basePath = callType === "video" ? "video" : "audio";
          hostJoinURL = `${frontendUrl}/user/${basePath}/${mentor._id}/${roomId}`;
          guestJoinURL = `${frontendUrl}/user/${basePath}/${mentor._id}/${roomId}`;
        }

        // Create chat session and respond for audio/video bookings
        const avChatData: any = {
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
            duration: String(durationMinutes),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            recordingId: null,
            recordingUrl: null,
          },
          status: "PENDING",
          isAnonymous: false,
        };
        const avChat = await Chat.create(avChatData);

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
            type: "credit",
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

        if (type === "slot") {
          return Ok(res, {
            message: "Slot booked; pending mentor confirmation",
            booking: {
              slotId,
              mentorId,
              userId,
              callType,
              time: parseInt(time)
            },
            room: {
              roomId,
              hostJoinURL,
              guestJoinURL
            },
            payment: {
              method: paymentMethod,
              amount: totalCost,
              transactionId
            },
            slotStatus: "pending",
            joinLink: guestJoinURL
          });
        }

        return Ok(res, {
          message: "Session booked successfully",
          sessionId: avChat._id,
          room: {
            roomId,
            hostJoinURL,
            guestJoinURL
          },
          payment: {
            method: paymentMethod,
            amount: totalCost,
            transactionId
          },
          joinLink: guestJoinURL
        });
        
      } else {
        const frontendUrl = process.env.FRONTEND_URL || "https://alterbuddy.com";
        hostJoinURL = `${frontendUrl}/user/chat/${mentor._id}/${roomId}`;
        hostJoinURL = hostJoinURL;
        if (callType === 'audio' || callType === 'video') {
          const basePath = callType === 'video' ? 'video' : 'audio';
          hostJoinURL = `${frontendUrl}/user/${basePath}/${mentor._id}/${roomId}`;
          guestJoinURL = hostJoinURL;
        }

        // using durationMinutes/startTime/endTime defined above
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
            duration: String(durationMinutes),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            recordingId: null,
            recordingUrl: null,
          },
          status: "PENDING",
          isAnonymous: false,
        };
        const chat = await Chat.create(chatData);

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

        // For slot bookings, respond immediately and let mentor confirm later
        if (type === "slot") {
          return Ok(res, {
            message: "Slot booked; pending mentor confirmation",
            booking: {
              slotId,
              mentorId,
              userId,
              callType,
              time: parseInt(time)
            },
            room: {
              roomId,
              hostJoinURL,
              guestJoinURL
            },
            payment: {
              method: paymentMethod,
              amount: totalCost,
              transactionId
            },
            slotStatus: "pending"
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
          
          const chat = await Chat.create(chatData);

          // Send emails asynchronously without blocking the booking process
          const sendEmails = async () => {
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
              try {
                await transporter.sendMail(userMailOptions);
              } catch (mailErr) {
                console.error("USER email send failed:", (mailErr as any)?.message || mailErr);
                // Do not fail confirmation due to email issues
              }

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
              try {
                await transporter.sendMail(mentorMailOptions);
              } catch (mailErr) {
                console.error("MENTOR email send failed:", (mailErr as any)?.message || mailErr);
                // Do not fail confirmation due to email issues
              }

              };

              // Fire and forget email sending
              sendEmails().catch((err) => console.error("SendEmails failed:", err));

              return Ok(res, {
                message: "Session booked successfully",
                sessionId: chat._id,
                room: {
                  roomId,
                  hostJoinURL,
                  guestJoinURL
                },
                payment: {
                  method: paymentMethod,
                  amount: totalCost,
                  transactionId
                },
                joinLink: guestJoinURL
              });
          }
          }
          }
          catch (err) {
            console.error("BookSlotByUserId Error:", err);
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

           public async ConfirmSlotByMentor(req: Request, res: Response) {
             try {
               const { slotId } = req.body as { slotId?: string };
               if (!slotId) {
                 return UnAuthorized(res, "slotId is required");
               }

               await CallSchedule.updateOne(
                 { "slots._id": new mongoose.Types.ObjectId(slotId) },
                 { $set: { "slots.$.status": "accepted", "slots.$.booked": true } }
               );

               // Create chat session for this slot upon mentor confirmation
               const schedule = await CallSchedule.findOne({ "slots._id": new mongoose.Types.ObjectId(slotId) });
               if (schedule) {
                 const slot = (schedule.slots || []).find((s: any) => String(s._id) === String(slotId));
                 const mentorIdStr = String(schedule.mentorId);
                 const userId = slot?.userId;
                 const callType = slot?.callType || 'chat';
                 const durationMinutes = Number(slot?.duration || 60);

                 // Generate room and join URLs (fallback to local URLs for reliability)
                 const roomId = generateRandomRoomId(12);
                 const frontendUrl = process.env.FRONTEND_URL || "https://alterbuddy.com";
                 let hostJoinURL = `${frontendUrl}/user/chat/${mentorIdStr}/${roomId}`;
                 let guestJoinURL = hostJoinURL;
                 if (callType === 'audio' || callType === 'video') {
                   const basePath = callType === 'video' ? 'video' : 'audio';
                   hostJoinURL = `${frontendUrl}/user/${basePath}/${mentorIdStr}/${roomId}`;
                   guestJoinURL = hostJoinURL;
                 }

                 const startTime = new Date();
                 const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

                 const chatData: any = {
                   users: {
                     user: userId,
                     mentor: schedule.mentorId,
                   },
                   sessionDetails: {
                     roomId,
                     roomCode: {
                       host: hostJoinURL ? hostJoinURL.split("/").pop() : undefined,
                       mentor: guestJoinURL ? guestJoinURL.split("/").pop() : undefined,
                     },
                     roomName: `Session-${Date.now()}`,
                     callType,
                     duration: String(durationMinutes),
                     startTime: startTime.toISOString(),
                     endTime: endTime.toISOString(),
                     recordingId: null,
                     recordingUrl: null,
                   },
                   status: "PENDING",
                   isAnonymous: false,
                 };
                 const chat = await Chat.create(chatData);

                 return Ok(res, {
                   message: 'Slot confirmed and chat created successfully',
                   sessionId: chat._id,
                   room: {
                     roomId,
                     hostJoinURL,
                     guestJoinURL
                   },
                   joinLink: guestJoinURL
                 });
               }

               return Ok(res, "Slot confirmed");
             } catch (err) {
               console.error("ConfirmSlotByMentor error:", err);
               return UnAuthorized(
                 res,
                 err instanceof Error ? err.message : "Unknown error"
               );
             }
           }

           public async UpdateSlot(req: Request, res: Response) {
             try {
               const { slotId } = req.params as { slotId?: string };
               const updates = req.body as Record<string, any>;
               if (!slotId) {
                 return UnAuthorized(res, "slotId is required");
               }

               // Map body keys to nested slot update paths
               const setPayload: Record<string, any> = {};
               for (const [key, value] of Object.entries(updates || {})) {
                 setPayload[`slots.$.${key}`] = value;
               }

               await CallSchedule.updateOne(
                 { "slots._id": new mongoose.Types.ObjectId(slotId) },
                 { $set: setPayload }
               );

               return Ok(res, "Slot updated");
             } catch (err) {
               console.error("UpdateSlot error:", err);
               return UnAuthorized(
                 res,
                 err instanceof Error ? err.message : "Unknown error"
               );
             }
           }
         }
