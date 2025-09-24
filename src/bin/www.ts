import http from "http";
import app from "../index";
import { Server } from "socket.io";
import { Chat, Notification } from "../model";
import { IChatProps } from "../interface/chat.interface";
import mongoose from "mongoose";

const port = process.env.PORT || 3000; // Railway auto-assigns PORT
const host = '0.0.0.0';
// Express app instance is already configured, no need to set port here


export const server = http.createServer(app);

const io = new Server(server, {
  path: '/socket.io/',
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Store mentor socket connections
const mentorSockets = new Map<string, string>(); // mentorId -> socketId

// ! ABLY When a client connects
io.on("connection", (socket) => {
  // Listen for mentor registration
  socket.on("registerMentor", (data) => {
    const { mentorId } = data;
    if (mentorId) {
      mentorSockets.set(mentorId, socket.id);
      console.log(`Mentor ${mentorId} registered with socket ${socket.id}`);
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

  // When the client disconnects
  socket.on("disconnect", () => {
    // Remove mentor from registered sockets
    for (const [mentorId, socketId] of mentorSockets.entries()) {
      if (socketId === socket.id) {
        mentorSockets.delete(mentorId);
        console.log(`Mentor ${mentorId} disconnected`);
        break;
      }
    }
    console.log("user disconnected:", socket.id);
  });
});

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
