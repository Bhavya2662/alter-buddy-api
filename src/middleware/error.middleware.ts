import { Request, NextFunction, Response } from "express";

import { STATUS_CODES } from "../interface";

export const errorHandler = (err: any, _: Request, res: Response, next: NextFunction): Response | void => {
     if (err.name === "ApiError") {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
               success: false,
               status_code: STATUS_CODES.BAD_REQUEST,
               message: err.message,
          });
     }
     if (err.name === "AuthError") {
          return res.status(STATUS_CODES.UNAUTHORIZED).json({
               success: false,
               status_code: STATUS_CODES.UNAUTHORIZED,
               message: err.message,
          });
     }
     if (err instanceof Error) {
          return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
               success: false,
               status_code: STATUS_CODES.INTERNAL_SERVER_ERROR,
               message: "Internal server error",
          });
     }
     next();
};

export const TryCatch = () => {
     return (_: Object, __?: string, descriptor?: PropertyDescriptor) => {
          const fn: Function = descriptor.value;
          descriptor.value = async (...args: [Request, Response, NextFunction]) => {
               try {
                    return await fn.apply(this, args);
               } catch (err) {
                    if (err.name === "ApiError") {
                         return args[1].status(STATUS_CODES.BAD_REQUEST).json({
                              success: false,
                              status_code: STATUS_CODES.BAD_REQUEST,
                              message: err.message,
                         });
                    }
                    if (err.name === "AuthError") {
                         return args[1].status(STATUS_CODES.UNAUTHORIZED).json({
                              success: false,
                              status_code: STATUS_CODES.UNAUTHORIZED,
                              message: err.message,
                         });
                    }
                    if (err instanceof Error) {
                         return args[1].status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                              success: false,
                              status_code: STATUS_CODES.INTERNAL_SERVER_ERROR,
                              message: "Internal server error",
                         });
                    }
               }
          };
     };
};
