import { Request, Response } from "express";

import { IController, IControllerRoutes } from "../../../interface";
import { getTokenFromHeader, Ok, UnAuthorized, verifyToken, BadRequest } from "../../../utils";
import Ably from "ably";
import { User, Mentor, Chat } from "../../../model";
import { StreamClient } from "@stream-io/node-sdk";
import { AuthForUser } from "../../../middleware";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { sendAnonymousSessionNotification } from "../../../bin/www";

export class RantController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      handler: this.GetAblyToken,
      method: "GET",
      path: "/rant/ably/token",
    });
    this.routes.push({
      handler: this.GetStreamToken,
      method: "GET",
      path: "/rant/get-stream/token",
    });
    this.routes.push({
      handler: this.CreateAnonymousSession,
      method: "POST",
      path: "/rant/anonymous-session",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetSessionStatus,
      method: "GET",
      path: "/rant/session-status/:sessionId",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.EndAnonymousSession,
      method: "POST",
      path: "/rant/end-session",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetActiveSessions,
      method: "GET",
      path: "/rant/active-sessions",
      middleware: [AuthForUser],
    });
  }

  public async GetAblyToken(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const user = await User.findOne({ _id: verified.id });
      const ably = new Ably.Realtime({
        key: "LrjjGQ.DPg-_Q:wmhnpNyD3kIbv-caW_glCxDlyIYwlT6pYQJTE4EJdCw",
      });
      const ablyToken = await ably.auth.createTokenRequest({
        clientId: user._id as unknown as string,
      });
      return Ok(res, ablyToken);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetStreamToken(req: Request, res: Response) {
    try {
      const client = new StreamClient(
        "n9y75xde4yk4",
        "2u4etpbwhrgb8kmffgt879pgknmdndzxs82hptqtxndt39ku3shc6yavpup2us8e"
      );
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const exp = Math.round(new Date().getTime() / 1000) + 60 * 60;

      const streamToken = client.createToken(verified.id, exp);
      return Ok(res, streamToken);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async CreateAnonymousSession(req: Request, res: Response) {
    try {
      const { sessionType } = req.body;
      const userId = (req as any).user.id;

      // Validate session type
      if (!sessionType || !["audio", "chat"].includes(sessionType)) {
        return BadRequest(res, "Invalid session type. Must be 'audio' or 'chat'");
      }

      // Verify user exists and is active
      const user = await User.findById(userId);
      if (!user) {
        return BadRequest(res, "User not found");
      }

      if (user.block) {
        return BadRequest(res, "Your account is blocked. Please contact support.");
      }

      // Check if user already has an active anonymous session
      const existingSession = await Chat.findOne({
        "users.user": userId,
        status: { $in: ["PENDING", "ACCEPTED"] },
        isAnonymous: true
      });

      if (existingSession) {
        return BadRequest(res, "You already have an active anonymous session. Please end it before starting a new one.");
      }

      // Find online mentors who are not in a call and not unavailable
      const availableMentors = await Mentor.find({
          "accountStatus.verification": true,
          "accountStatus.block": false,
          "accountStatus.online": true,
          inCall: false,
          isUnavailable: false,
          status: true
        });

      // Log mentor availability for monitoring
      const totalMentors = await Mentor.countDocuments({ status: true });
      const onlineMentors = await Mentor.countDocuments({ "accountStatus.online": true, status: true });
      
      console.log(`Mentor availability check: Total: ${totalMentors}, Online: ${onlineMentors}, Available: ${availableMentors.length}`);

      if (availableMentors.length === 0) {
        // Provide more specific error message based on mentor availability
        if (onlineMentors === 0) {
          return BadRequest(res, "No mentors are currently online. Please try again later.");
        } else {
          return BadRequest(res, "All mentors are currently busy. Please try again in a few minutes.");
        }
      }

      // Randomly select a mentor
      const randomIndex = Math.floor(Math.random() * availableMentors.length);
      const selectedMentor = availableMentors[randomIndex];

      // Generate anonymous session ID with better entropy
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const anonymousSessionId = `rant_${timestamp}_${randomStr}`;
      const roomId = `room_${timestamp}_${randomStr}`;

      try {
        // Create anonymous chat session with transaction-like behavior
        const anonymousSession = await Chat.create({
          users: {
            user: userId,
            mentor: selectedMentor._id,
          },
          sessionDetails: {
            roomId,
            roomCode: {
              host: anonymousSessionId,
              mentor: anonymousSessionId,
            },
            roomName: `Anonymous-Rant-${timestamp}`,
            callType: sessionType,
            duration: "30", // Default 30 minutes for rant sessions
            startTime: new Date(),
            endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            recordingId: null,
            recordingUrl: null,
          },
          status: "PENDING",
          isAnonymous: true,
          anonymousSessionId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expire in 10 minutes if not accepted
        });

        // Mark mentor as potentially busy (but not fully in call until accepted)
        await Mentor.findByIdAndUpdate(selectedMentor._id, { 
          // Don't mark as inCall yet - only when session is accepted
          // This will be handled in the socket event when mentor accepts
        });

        // Send real-time notification to the selected mentor
        let notificationSent = false;
        try {
          notificationSent = sendAnonymousSessionNotification(selectedMentor._id.toString(), {
            sessionId: anonymousSessionId,
            sessionType,
            roomId,
            userId,
            message: "New anonymous rant session request",
            timestamp: new Date().toISOString(),
            estimatedDuration: "30 minutes",
          });
        } catch (notificationError) {
          console.error(`Failed to send notification to mentor ${selectedMentor._id}:`, notificationError);
        }

        if (!notificationSent) {
          console.warn(`Failed to send notification to mentor ${selectedMentor._id} - mentor may be offline`);
          // Don't fail the request, but log for monitoring
        }

        // Set up automatic cleanup for expired sessions
        setTimeout(async () => {
          try {
            const session = await Chat.findOne({ 
              anonymousSessionId, 
              status: "PENDING" 
            });
            if (session) {
              await Chat.findByIdAndUpdate(session._id, { 
                status: "EXPIRED",
                "sessionDetails.endTime": new Date()
              });
              
              // Free up the mentor if session expired (they weren't marked as inCall yet, so no need to update)
              console.log(`Session ${anonymousSessionId} expired and cleaned up`);
            }
          } catch (cleanupError) {
            console.error(`Error cleaning up expired session ${anonymousSessionId}:`, cleanupError);
          }
        }, 10 * 60 * 1000); // 10 minutes

        return Ok(res, {
          sessionId: anonymousSessionId,
          roomId,
          sessionType,
          message: "Anonymous session created successfully",
          waitingForMentor: true,
          mentorId: selectedMentor._id,
          estimatedWaitTime: "1-2 minutes",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
      } catch (dbError) {
        console.error("Database error creating session:", dbError);
        return BadRequest(res, "Failed to create session due to database error. Please try again.");
      }
    } catch (err: any) {
      console.error("Error creating anonymous session:", err);
      
      // Provide more specific error messages based on error type
      if (err.name === 'ValidationError') {
        return BadRequest(res, `Invalid data: ${err.message}`);
      }
      
      if (err.name === 'MongoError' || err.name === 'MongooseError') {
        return BadRequest(res, "Database connection error. Please try again.");
      }
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return BadRequest(res, "Service temporarily unavailable. Please try again later.");
      }
      
      // Generic error for unexpected cases
      return UnAuthorized(res, "An unexpected error occurred. Please try again.");
    }
  }

  public async GetSessionStatus(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user.id;

      const session = await Chat.findOne({
        anonymousSessionId: sessionId,
        $or: [
          { "users.user": userId },
          { "users.mentor": userId }
        ]
      }).populate("users.user users.mentor", "name email");

      if (!session) {
        return BadRequest(res, "Session not found or access denied");
      }

      return Ok(res, {
        sessionId: session.anonymousSessionId,
        status: session.status,
        sessionType: session.sessionDetails.callType,
        roomId: session.sessionDetails.roomId,
        startTime: session.sessionDetails.startTime,
        endTime: session.sessionDetails.endTime,
        isAnonymous: session.isAnonymous,
      });
    } catch (err) {
      console.error("Error getting session status:", err);
      return UnAuthorized(res, "Failed to get session status");
    }
  }

  public async EndAnonymousSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;
      const userId = (req as any).user.id;

      const session = await Chat.findOne({
        anonymousSessionId: sessionId,
        $or: [
          { "users.user": userId },
          { "users.mentor": userId }
        ]
      });

      if (!session) {
        return BadRequest(res, "Session not found or access denied");
      }

      // Update session status to COMPLETED
      await Chat.findByIdAndUpdate(session._id, {
        status: "COMPLETED",
        "sessionDetails.endTime": new Date().toISOString(),
      });

      // Free up the mentor
      await Mentor.findByIdAndUpdate(session.users.mentor, { inCall: false });

      return Ok(res, {
        message: "Session ended successfully",
        sessionId,
      });
    } catch (err) {
      console.error("Error ending session:", err);
      return UnAuthorized(res, "Failed to end session");
    }
  }

  public async GetActiveSessions(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const activeSessions = await Chat.find({
        "users.user": userId,
        status: { $in: ["PENDING", "ACCEPTED"] },
        isAnonymous: true
      }).select("anonymousSessionId status sessionDetails.callType sessionDetails.startTime");

      return Ok(res, {
        activeSessions: activeSessions.map(session => ({
          sessionId: session.anonymousSessionId,
          status: session.status,
          sessionType: session.sessionDetails.callType,
          startTime: session.sessionDetails.startTime
        }))
      });
    } catch (err) {
      console.error("Error getting active sessions:", err);
      return UnAuthorized(res, "Failed to get active sessions");
    }
  }
}
