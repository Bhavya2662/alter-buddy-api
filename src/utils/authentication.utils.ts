import jwt from "jsonwebtoken";
import config from "config";
import { Request } from "express";

export const getTokenFromHeader = (req: Request) => {
     const authHeader = req.headers.authorization;
     if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.substring(7); // Remove 'Bearer ' prefix
     }
     // Fallback: try cookies for cross-device auth
     const adminToken = (req as any).cookies?.adminToken;
     const mentorToken = (req as any).cookies?.mentorToken;
     const userToken = (req as any).cookies?.userToken;
     return adminToken || mentorToken || userToken || undefined as any;
};
export const verifyToken = (token: string) => {
     return jwt.verify(token, config.get("JWT_SECRET")) as any;
};
