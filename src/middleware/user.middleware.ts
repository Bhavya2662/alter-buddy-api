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
    console.log('=== AUTH DEBUG START ===');
    const token = getTokenFromHeader(req);
    console.log('Token extracted:', token ? 'Token present' : 'No token');
    
    if (!token) {
      console.log('No token found in header');
      return BadRequest(res, "please login");
    }

    console.log('Attempting to verify token...');
    const verified = verifyToken(token);
    console.log('Token verified successfully:', verified);

    console.log('Looking for user with ID:', verified.id);
    const user = await User.findOne({ _id: verified.id });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('User not found in database');
      return UnAuthorized(res, "user not found");
    }

    console.log('User account type:', user.acType);
    if (user.acType !== "USER") {
      console.log('Access denied - not a USER account');
      return UnAuthorized(res, "access_denied");
    }

    console.log('Checking verified.id:', verified.id);
    if (!verified.id) {
      console.log('Failed to verify token - no ID');
      return BadRequest(res, "failed to verify token");
    }

    console.log('Authentication successful, proceeding...');
    // Attach user info to request for use in controllers
    (req as any).user = {
      id: verified.id,
      userData: user
    };
    console.log('=== AUTH DEBUG END ===');
    next();
  } catch (err) {
    console.log('=== AUTH ERROR ===');
    console.log('Authentication error:', err);
    console.log('Error message:', err.message);
    console.log('Error stack:', err.stack);
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
