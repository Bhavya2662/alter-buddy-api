import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
import { AuthForUser, AuthForMentor } from "../../../middleware";
import { SessionPackage } from "../../../model/session-package.model";
import { Chat, User, Mentor } from "../../../model";
import { getTokenFromHeader, verifyToken, Ok, UnAuthorized, BadRequest } from "../../../utils";
import mongoose from "mongoose";

export class ChatSupportController implements IController {
  public routes: IControllerRoutes[] = [
    {
      path: "/chat-support/activate",
      method: "POST",
      handler: this.ActivateChatSupport,
      middleware: [AuthForUser],
    },
    {
      path: "/chat-support/sessions/:userId",
      method: "GET",
      handler: this.GetUserChatSupportSessions,
      middleware: [AuthForUser],
    },
    {
      path: "/chat-support/mentor/:mentorId",
      method: "GET",
      handler: this.GetMentorChatSupportSessions,
      middleware: [AuthForMentor],
    },
    {
      path: "/chat-support/start",
      method: "POST",
      handler: this.StartChatSupportSession,
      middleware: [AuthForUser],
    },
    {
      path: "/chat-support/send-message",
      method: "POST",
      handler: this.SendChatMessage,
      middleware: [AuthForUser, AuthForMentor],
    },
    {
      path: "/chat-support/messages/:sessionId",
      method: "GET",
      handler: this.GetChatMessages,
      middleware: [AuthForUser, AuthForMentor],
    },
  ];

  /**
   * Activate chat support for a completed package
   */
  public async ActivateChatSupport(req: Request, res: Response) {
    try {
      const { packageId } = req.body;
      const token = getTokenFromHeader(req);
      const userId = verifyToken(token);

      // Find the completed package
      const sessionPackage = await SessionPackage.findById(packageId);
      if (!sessionPackage) {
        return UnAuthorized(res, "Package not found");
      }

      if (sessionPackage.userId?.toString() !== userId.id) {
        return UnAuthorized(res, "Package does not belong to user");
      }

      if (sessionPackage.remainingSessions > 0) {
        return BadRequest(res, "Package must be completed to activate chat support");
      }

      if (sessionPackage.status === "chat_support_active") {
        return BadRequest(res, "Chat support is already active for this package");
      }

      // Activate chat support for 1 week
      const chatSupportExpiresAt = new Date();
      chatSupportExpiresAt.setDate(chatSupportExpiresAt.getDate() + 7);

      await SessionPackage.findByIdAndUpdate(packageId, {
        status: "chat_support_active",
        chatSupportExpiresAt,
      });

      return Ok(res, {
        message: "Chat support activated successfully",
        expiresAt: chatSupportExpiresAt,
        packageId,
      });
    } catch (err) {
      console.error("Error activating chat support:", err);
      return UnAuthorized(res, "Failed to activate chat support");
    }
  }

  /**
   * Get user's active chat support sessions
   */
  public async GetUserChatSupportSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const token = getTokenFromHeader(req);
      const verifiedUser = verifyToken(token);

      if (verifiedUser.id !== userId) {
        return UnAuthorized(res, "Access denied");
      }

      // Find active chat support packages
      const activeChatSupport = await SessionPackage.find({
        userId,
        status: "chat_support_active",
        chatSupportExpiresAt: { $gt: new Date() },
      })
        .populate("mentorId categoryId")
        .sort({ chatSupportExpiresAt: 1 });

      return Ok(res, activeChatSupport);
    } catch (err) {
      console.error("Error getting user chat support sessions:", err);
      return UnAuthorized(res, "Failed to get chat support sessions");
    }
  }

  /**
   * Get mentor's chat support sessions
   */
  public async GetMentorChatSupportSessions(req: Request, res: Response) {
    try {
      const { mentorId } = req.params;
      const token = getTokenFromHeader(req);
      const verifiedMentor = verifyToken(token);

      if (verifiedMentor.id !== mentorId) {
        return UnAuthorized(res, "Access denied");
      }

      // Find active chat support packages for this mentor
      const activeChatSupport = await SessionPackage.find({
        mentorId,
        status: "chat_support_active",
        chatSupportExpiresAt: { $gt: new Date() },
      })
        .populate("userId categoryId")
        .sort({ chatSupportExpiresAt: 1 });

      return Ok(res, activeChatSupport);
    } catch (err) {
      console.error("Error getting mentor chat support sessions:", err);
      return UnAuthorized(res, "Failed to get chat support sessions");
    }
  }

  /**
   * Start a chat support session
   */
  public async StartChatSupportSession(req: Request, res: Response) {
    try {
      const { packageId } = req.body;
      const token = getTokenFromHeader(req);
      const userId = verifyToken(token);

      // Verify package has active chat support
      const sessionPackage = await SessionPackage.findById(packageId)
        .populate("mentorId userId");
      
      if (!sessionPackage) {
        return UnAuthorized(res, "Package not found");
      }

      if (sessionPackage.userId?.toString() !== userId.id) {
        return UnAuthorized(res, "Package does not belong to user");
      }

      if (sessionPackage.status !== "chat_support_active") {
        return BadRequest(res, "Chat support is not active for this package");
      }

      if (new Date() > sessionPackage.chatSupportExpiresAt!) {
        return BadRequest(res, "Chat support has expired");
      }

      // Check if there's already an active chat support session
      const existingSession = await Chat.findOne({
        "users.user": userId.id,
        "users.mentor": sessionPackage.mentorId._id,
        "sessionDetails.callType": "chat",
        status: { $in: ["PENDING", "ACCEPTED", "ONGOING"] },
        isChatSupport: true,
      });

      if (existingSession) {
        return Ok(res, {
          message: "Chat support session already exists",
          sessionId: existingSession._id,
          roomId: existingSession.sessionDetails.roomId,
        });
      }

      // Create new chat support session
      const roomId = `chat-support-${Date.now()}`;
      const chatSession = await Chat.create({
        users: {
          user: userId.id,
          mentor: sessionPackage.mentorId._id,
        },
        sessionDetails: {
          roomId,
          roomName: `Chat Support - ${sessionPackage.type} Package`,
          callType: "chat",
          duration: "unlimited",
          startTime: new Date().toISOString(),
          endTime: sessionPackage.chatSupportExpiresAt!.toISOString(),
        },
        status: "PENDING",
        isChatSupport: true,
        packageId: sessionPackage._id,
        message: [],
      });

      return Ok(res, {
        message: "Chat support session created successfully",
        sessionId: chatSession._id,
        roomId,
        expiresAt: sessionPackage.chatSupportExpiresAt,
      });
    } catch (err) {
      console.error("Error starting chat support session:", err);
      return UnAuthorized(res, "Failed to start chat support session");
    }
  }

  /**
   * Send a message in chat support session
   */
  public async SendChatMessage(req: Request, res: Response) {
    try {
      const { sessionId, message } = req.body;
      const token = getTokenFromHeader(req);
      const user = verifyToken(token);

      // Find the chat session
      const chatSession = await Chat.findById(sessionId)
        .populate("users.user users.mentor");
      
      if (!chatSession) {
        return UnAuthorized(res, "Chat session not found");
      }

      // Verify user has access to this session
      const hasAccess = 
        (chatSession.users.user as any)._id.toString() === user.id ||
        (chatSession.users.mentor as any)._id.toString() === user.id;
      
      if (!hasAccess) {
        return UnAuthorized(res, "Access denied to this chat session");
      }

      // Check if chat support is still active
      if ((chatSession as any).isChatSupport) {
        const sessionPackage = await SessionPackage.findById(chatSession.packageId);
        if (!sessionPackage || 
            sessionPackage.status !== "chat_support_active" ||
            new Date() > sessionPackage.chatSupportExpiresAt!) {
          return BadRequest(res, "Chat support has expired");
        }
      }

      // Determine sender details
      const isUser = (chatSession.users.user as any)._id.toString() === user.id;
      const senderName = isUser ? 
        (chatSession.users.user as any).name : 
        (chatSession.users.mentor as any).name;

      // Add message to chat
      const newMessage = {
        message,
        senderId: user.id,
        senderName,
        timestamp: new Date().toISOString(),
        topic: "chat-support",
      };

      await Chat.findByIdAndUpdate(sessionId, {
        $push: { message: newMessage },
        status: "ONGOING",
      });

      return Ok(res, {
        message: "Message sent successfully",
        messageData: newMessage,
      });
    } catch (err) {
      console.error("Error sending chat message:", err);
      return UnAuthorized(res, "Failed to send message");
    }
  }

  /**
   * Get messages from a chat support session
   */
  public async GetChatMessages(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const token = getTokenFromHeader(req);
      const user = verifyToken(token);

      // Find the chat session
      const chatSession = await Chat.findById(sessionId)
        .populate("users.user users.mentor");
      
      if (!chatSession) {
        return UnAuthorized(res, "Chat session not found");
      }

      // Verify user has access to this session
      const hasAccess = 
        (chatSession.users.user as any)._id.toString() === user.id ||
        (chatSession.users.mentor as any)._id.toString() === user.id;
      
      if (!hasAccess) {
        return UnAuthorized(res, "Access denied to this chat session");
      }

      return Ok(res, {
        messages: chatSession.message,
        sessionDetails: {
          roomId: chatSession.sessionDetails.roomId,
          roomName: chatSession.sessionDetails.roomName,
          status: chatSession.status,
          isChatSupport: chatSession.isChatSupport,
        },
      });
    } catch (err) {
      console.error("Error getting chat messages:", err);
      return UnAuthorized(res, "Failed to get messages");
    }
  }
}