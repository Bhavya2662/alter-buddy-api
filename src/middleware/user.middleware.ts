import { Request, Response } from "express";
import { NextFunction } from "express";
import { Mentor, User } from "../model";
import {
  BadRequest,
  UnAuthorized,
  getTokenFromHeader,
  verifyToken,
} from "../utils";

export const AuthForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getTokenFromHeader(req);
    
    if (!token) {
      return BadRequest(res, "please login");
    }

    const verified = verifyToken(token);
    const user = await User.findOne({ _id: verified.id });

    if (!user) {
      return UnAuthorized(res, "user not found");
    }

    if (user.acType !== "USER") {
      return UnAuthorized(res, "access_denied");
    }

    // Check if user is permanently deactivated (but allow deactivation endpoint access)
    if (user.deactivation?.isDeactivated && user.deactivation?.type === 'permanent') {
      // Allow access to deactivation/reactivation endpoints for account management
      const isDeactivationEndpoint = req.path.includes('/deactivate') || req.path.includes('/reactivate');
      if (!isDeactivationEndpoint) {
        return UnAuthorized(res, "Your account has been permanently deactivated");
      }
    }
    
    // Temporarily deactivated users can access all endpoints (they auto-reactivate on login)
    // No additional restrictions needed for temporary deactivation

    if (!verified.id) {
      return BadRequest(res, "failed to verify token");
    }

    // Attach user info to request for use in controllers
    (req as any).user = {
      id: verified.id,
      userData: user
    };
    next();
  } catch (err) {
    return UnAuthorized(res, err);
  }
};

export const AuthForMentor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return BadRequest(res, "please login");
    }

    const verified = verifyToken(token);

    const mentor = await Mentor.findOne({ _id: verified.id });

    if (!mentor) {
      return UnAuthorized(res, "mentor not found");
    }

    if (mentor.acType !== "MENTOR") {
      return UnAuthorized(res, "access_denied");
    }

    if (!verified.id) {
      return BadRequest(res, "failed to verify token");
    }

    next();
  } catch (err) {
    return UnAuthorized(res, err);
  }
};

export const AuthForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return BadRequest(res, "please login");
    }

    const verified = verifyToken(token);
    const user = await User.findOne({ _id: verified.id });
    
    if (!user) {
      return UnAuthorized(res, "user not found");
    }
    
    if (user.acType !== "ADMIN") {
      return UnAuthorized(res, "access_denied");
    }

    if (!verified.id) {
      return BadRequest(res, "failed to verify token");
    }

    next();
  } catch (err) {
    return UnAuthorized(res, err);
  }
};
