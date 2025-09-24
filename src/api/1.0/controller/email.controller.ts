import { Request, Response } from "express";
import { IControllerRoutes, IController } from "../../../interface";
import { Ok, UnAuthorized } from "../../../utils";
import nodemailer from "nodemailer";
import { AuthForUser } from "../../../middleware";

export class EmailController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes = [
      {
        path: "/send-email",
        method: "post",
        handler: this.sendEmail,
        localMiddleware: [AuthForUser],
      },
    ];
  }

  /**
   * Send an email with the provided details
   * @param req Request object containing email details
   * @param res Response object
   * @returns API response
   */
  public async sendEmail(req: Request, res: Response) {
    try {
      const { to, subject, html, from } = req.body;

      if (!to || !subject || !html) {
        return UnAuthorized(res, "Missing required email fields");
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: true },
      });

      const mailOptions = {
        from: from || process.env.SMTP_FROM,
        to,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);

      return Ok(res, {
        message: "Email sent successfully",
      });
    } catch (err) {
      console.error("Email sending failed:", err);
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Failed to send email"
      );
    }
  }
}