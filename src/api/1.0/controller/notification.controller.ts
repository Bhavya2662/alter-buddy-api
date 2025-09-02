import { Request, Response } from "express";
import { IControllerRoutes, IController } from "../../../interface";
import { Notification } from "../../../model";
import { getTokenFromHeader, Ok, UnAuthorized, verifyToken } from "../../../utils";

export class NotificationController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/my-notification",
      handler: this.GetNotificationByMentorId,
      method: "GET",
    });
  }
  public async GetNotificationByMentorId(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verify = verifyToken(token);
      const notification = await Notification.find({
        notificationFor: "mentor",
        notificationTo: verify.id,
      });
      return Ok(res, notification);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
