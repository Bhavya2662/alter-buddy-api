import { Request, Response } from "express";
import { GroupSession } from "../../../model/group-session.model";
import { Ok, UnAuthorized } from "../../../utils";
import { IController, IControllerRoutes } from "../../../interface";
import { AuthForMentor, AuthForUser } from "../../../middleware";

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

      if (session.bookedUsers.includes(userId)) {
        return UnAuthorized(res, "User already booked");
      }

      if (session.bookedUsers.length >= session.capacity) {
        return UnAuthorized(res, "Session is full");
      }

      session.bookedUsers.push(userId);
      await session.save();

      return Ok(res, session);
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
