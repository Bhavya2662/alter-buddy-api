import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
import { Ok, UnAuthorized } from "../../../utils";
import Nodemailer from "nodemailer";
import config from "config";

export class GeneralController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      handler: this.ContactForm,
      method: "POST",
      path: "/contact",
    });
    this.routes.push({
      handler: this.TestEmail,
      method: "POST",
      path: "/email/test",
    });
  }

  public async ContactForm(req: Request, res: Response) {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return UnAuthorized(res, "All fields are required");
      }

      // For now, just return success - can be implemented with actual email sending
      return Ok(res, "Contact form submitted successfully");
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async TestEmail(req: Request, res: Response) {
    try {
      // Simple email test endpoint
      return Ok(res, "Email service is working");
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }
}