import http from "http";
import app from "../index";
import { normalizePort } from "../utils";
import { Server } from "socket.io";
import { Chat, Notification, User } from "../model";
import { IChatProps } from "../interface/chat.interface";
import mongoose from "mongoose";

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

console.log(`Registering route: POST /api/1.0/send-email`);
console.log(`server enabled on port ${port} (Railway deployment)`);

export const server = http.createServer(app);

export const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Store mentor socket connections
const mentorSockets = new Map<string, string>(); // mentorId -> socketId
// Store user socket connections
const userSockets = new Map<string, string>(); // userId -> socketId
// Add heartbeat tracking for mentors
const mentorLastSeen = new Map<string, number>();
const HEARTBEAT_THRESHOLD_MS = 60000; // 60s inactivity marks offline

// ! ABLY When a client connects
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  // Listen for mentor registration
  socket.on("registerMentor", async (data) => {
    const { mentorId } = data;
    if (mentorId) {
      mentorSockets.set(mentorId, socket.id);
      console.log(`Mentor ${mentorId} registered with socket ${socket.id}`);
      
      // Update mentor online status in database
      try {
        const { Mentor } = require("../model");
        await Mentor.findByIdAndUpdate(mentorId, { $set: { "accountStatus.online": true } });
        console.log(`Mentor ${mentorId} status updated to online`);
        
        // Broadcast mentor online status to all clients
        io.emit('mentorStatusUpdated', {
          mentorId,
          accountStatus: { online: true },
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error updating mentor ${mentorId} online status:`, error);
      }
      // Track last seen immediately on registration
      mentorLastSeen.set(data.mentorId, Date.now());
    }
  });
  
  // Listen for user registration
  socket.on("registerUser", async (data) => {
    const { userId } = data;
    if (userId) {
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
      
      // Update user online status in database
      try {
        const { User } = require("../model");
        await User.findByIdAndUpdate(userId, { $set: { online: true } });
        console.log(`User ${userId} status updated to online`);
      } catch (error) {
        console.error(`Error updating user ${userId} online status:`, error);
      }
    }
  });
  
  // Listen for manual status updates
  socket.on("updateStatus", async (data) => {
    const { userId, status } = data;
    if (userId && typeof status === 'boolean') {
      console.log(`Manual status update for user ${userId}: ${status ? 'online' : 'offline'}`);
      
      try {
        const { User } = require("../model");
        await User.findByIdAndUpdate(userId, { $set: { online: status } });
        console.log(`User ${userId} status manually updated to ${status ? 'online' : 'offline'}`);
      } catch (error) {
        console.error(`Error updating user ${userId} status:`, error);
      }
    }
  });

  // Listen for chat request from the first app
  socket.on("requestChat", (data) => {
    // Emit chat request to the second app
    socket.broadcast.emit("receiveChatRequest", data);
  });

  // Listen for chat acceptance from the second app
  socket.on("acceptChat", (data, callback) => {
    // Notify the first app that the chat has been accepted
    socket.broadcast.emit("chatAccepted", data);

    // Call the callback to acknowledge
    if (callback) callback();
  });

  // Handle leaving the chat
  socket.on("leaveChat", (data, callback) => {
    // Notify the other app that the chat was left
    socket.broadcast.emit("chatLeft", data);

    // Acknowledge the event to the client
    if (callback) callback();
  });

  // Handle anonymous rant session acceptance
  socket.on("acceptAnonymousSession", async (data, callback) => {
    try {
      const { sessionId, mentorId } = data;
      
      // Update session status to ACCEPTED
      await Chat.findOneAndUpdate(
        { anonymousSessionId: sessionId },
        { status: "ACCEPTED" }
      );

      // Notify the user that mentor has joined
      socket.broadcast.emit("anonymousSessionAccepted", {
        sessionId,
        message: "Mentor has joined the session"
      });

      if (callback) callback({ success: true });
    } catch (error) {
      console.error("Error accepting anonymous session:", error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Handle anonymous rant session rejection
  socket.on("rejectAnonymousSession", async (data, callback) => {
    try {
      const { sessionId, mentorId } = data;
      
      // Update session status to REJECTED and free up the mentor
      await Chat.findOneAndUpdate(
        { anonymousSessionId: sessionId },
        { status: "REJECTED" }
      );

      // Free up the mentor
      await require("../model").Mentor.findByIdAndUpdate(mentorId, { inCall: false });

      // Notify the user that session was rejected
      socket.broadcast.emit("anonymousSessionRejected", {
        sessionId,
        message: "Session was declined. Please try again."
      });

      if (callback) callback({ success: true });
    } catch (error) {
      console.error("Error rejecting anonymous session:", error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  // Duplicate disconnect handler removed; see consolidated handler below after heartbeat logic.

  // Handle manual user status updates
  socket.on("updateUserStatus", async (data) => {
    console.log('🔄 updateUserStatus event received:', data);
    const { userId, online } = data;
    if (userId && typeof online === 'boolean') {
      try {
        await User.findByIdAndUpdate(userId, { $set: { online } });
        console.log(`User ${userId} status manually updated to ${online ? 'online' : 'offline'}`);
      } catch (error) {
        console.error(`Error manually updating user ${userId} status:`, error);
      }
    } else {
      console.log('❌ Invalid data for updateUserStatus:', { userId, online, typeOfOnline: typeof online });
    }
  });

  // Add: Handle manual mentor status updates
  socket.on("updateMentorStatus", async (data) => {
    console.log('🔄 updateMentorStatus event received:', data);
    const { mentorId, online } = data;
    if (mentorId && typeof online === 'boolean') {
      try {
        const { Mentor } = require("../model");
        const updatedMentor = await Mentor.findByIdAndUpdate(
          mentorId,
          { $set: { "accountStatus.online": online } },
          { new: true }
        );

        if (updatedMentor) {
          console.log(`Mentor ${mentorId} status manually updated to ${online ? 'online' : 'offline'}`);
          io.emit('mentorStatusUpdated', {
            mentorId,
            accountStatus: updatedMentor.accountStatus,
            inCall: updatedMentor.inCall,
            isUnavailable: updatedMentor.isUnavailable,
            status: updatedMentor.status,
            timestamp: new Date()
          });
        } else {
          console.warn(`Mentor ${mentorId} not found for manual status update`);
        }
      } catch (error) {
        console.error(`Error manually updating mentor ${mentorId} status:`, error);
      }
    } else {
      console.log('❌ Invalid data for updateMentorStatus:', { mentorId, online, typeOfOnline: typeof online });
    }
  });

  // New: Mentor heartbeat event to keep presence alive
  socket.on("mentorHeartbeat", (data: { mentorId: string }) => {
    const { mentorId } = data || {} as any;
    if (mentorId && mentorSockets.get(mentorId) === socket.id) {
      mentorLastSeen.set(mentorId, Date.now());
      // console.log(`❤️‍🔥 Heartbeat from mentor ${mentorId}`);
    }
  });

  // When the client disconnects
  socket.on("disconnect", async () => {
    console.log("🔌 Socket disconnect event triggered for socket:", socket.id);
    
    // Remove mentor socket if exists
    for (const [mentorId, socketId] of mentorSockets.entries()) {
      if (socketId === socket.id) {
        mentorSockets.delete(mentorId);
        console.log(`Mentor ${mentorId} disconnected`);
        
        // Update mentor offline status in database
        try {
          const { Mentor } = require("../model");
          await Mentor.findByIdAndUpdate(mentorId, { $set: { "accountStatus.online": false } });
          console.log(`Mentor ${mentorId} status updated to offline`);
          
          // Broadcast mentor offline status to all clients
          io.emit('mentorStatusUpdated', {
            mentorId,
            accountStatus: { online: false },
            timestamp: new Date()
          });
        } catch (error) {
          console.error(`Error updating mentor ${mentorId} offline status:`, error);
        }
        break;
      }
    }
    
    // Remove user socket and update status if exists
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        
        // Update user offline status in database
        try {
          await User.findByIdAndUpdate(userId, { $set: { online: false } });
          console.log(`✅ User ${userId} status updated to offline in database`);
        } catch (error) {
          console.error(`❌ Error updating user ${userId} offline status:`, error);
        }
        break;
      }
    }
  });
  
  // Close io.on("connection") block
});

  // Periodic sweep: mark mentors offline if heartbeat stale
  setInterval(async () => {
    try {
      const now = Date.now();
      for (const [mentorId, socketId] of mentorSockets.entries()) {
        const lastSeen = mentorLastSeen.get(mentorId) || 0;
        if (now - lastSeen > HEARTBEAT_THRESHOLD_MS) {
          const { Mentor } = require("../model");
          await Mentor.findByIdAndUpdate(mentorId, { $set: { "accountStatus.online": false } });
          io.emit('mentorStatusUpdated', {
            mentorId,
            accountStatus: { online: false },
            timestamp: new Date()
          });
          // Remove stale socket mapping; if socket is truly alive, it will re-register/heartbeat
          mentorSockets.delete(mentorId);
          mentorLastSeen.delete(mentorId);
          console.log(`⌛ Mentor ${mentorId} marked offline due to inactivity`);
        }
      }
    } catch (error) {
      console.error('Heartbeat sweep error:', error);
    }
  }, 30000);

  // Function to send notification to specific mentor
  export const sendAnonymousSessionNotification = (mentorId: string, sessionData: any) => {
    const mentorSocketId = mentorSockets.get(mentorId);
    if (mentorSocketId) {
      io.to(mentorSocketId).emit("anonymousSessionRequest", sessionData);
      return true;
    }
    return false;
  };

  const onError = (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error;
    }
    const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
    switch (error.code) {
      case "EACCES":
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  };

  const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
    console.info(`server enabled on ${bind} (Railway deployment)`);
  };

  server.listen(port as number, host);
  server.on("error", onError);
  server.on("listening", onListening);
