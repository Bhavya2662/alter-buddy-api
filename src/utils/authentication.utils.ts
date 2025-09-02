import jwt from "jsonwebtoken";
import config from "config";
import { Request } from "express";

export const getTokenFromHeader = (req: Request) => {
     const authHeader = req.headers.authorization;
     if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.substring(7); // Remove 'Bearer ' prefix
     }
     return authHeader; // Fallback for backward compatibility
};
export const verifyToken = (token: string) => {
     return jwt.verify(token, config.get("JWT_SECRET")) as any;
};
