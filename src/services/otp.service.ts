import Nodemailer, { SendMailOptions } from "nodemailer";
import { User } from "../model";

export class OTPService {
  private static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private static getOTPExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes expiry
    return expiryTime;
  }

  public static async generateAndSendEmailOTP(userId: string, email: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpCode = this.generateOTP();
      const expiresAt = this.getOTPExpiryTime();

      // Update user with email OTP
      await User.findByIdAndUpdate(userId, {
        $set: {
          "otp.email.code": otpCode,
          "otp.email.expiresAt": expiresAt,
          "otp.email.verified": false,
        },
      });

      // Send email
      const transporter = Nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: true,
        },
      });

      const mailOptions: SendMailOptions = {
        from: "alterbuddy8@gmail.com",
        to: email,
        subject: "AlterBuddy - Email Verification OTP",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; background-color: #4caf50; padding: 20px; color: #ffffff; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; text-align: center; }
              .otp-code { font-size: 32px; font-weight: bold; color: #4caf50; background-color: #f0f8f0; padding: 15px; border-radius: 8px; margin: 20px 0; letter-spacing: 3px; }
              .footer { text-align: center; color: #666; font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification</h1>
              </div>
              <div class="content">
                <h2>Welcome to AlterBuddy!</h2>
                <p>Please use the following OTP to verify your email address:</p>
                <div class="otp-code">${otpCode}</div>
                <p>This OTP will expire in 10 minutes.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>© 2024 AlterBuddy. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: "Email OTP sent successfully" };
    } catch (error) {
      console.error("Error sending email OTP:", error);
      return { success: false, message: "Failed to send email OTP" };
    }
  }

  public static async generateAndSendMobileOTP(userId: string, mobile: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpCode = this.generateOTP();
      const expiresAt = this.getOTPExpiryTime();

      // Update user with mobile OTP
      await User.findByIdAndUpdate(userId, {
        $set: {
          "otp.mobile.code": otpCode,
          "otp.mobile.expiresAt": expiresAt,
          "otp.mobile.verified": false,
        },
      });

      // For now, we'll log the OTP (in production, integrate with SMS service like Twilio)
      console.log(`Mobile OTP for ${mobile}: ${otpCode}`);
      
      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      // Example Twilio integration:
      // const twilioClient = require('twilio')(accountSid, authToken);
      // await twilioClient.messages.create({
      //   body: `Your AlterBuddy verification code is: ${otpCode}. Valid for 10 minutes.`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: mobile
      // });

      return { success: true, message: "Mobile OTP generated successfully (check console for now)" };
    } catch (error) {
      console.error("Error generating mobile OTP:", error);
      return { success: false, message: "Failed to generate mobile OTP" };
    }
  }

  public static async verifyEmailOTP(userId: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.otp?.email) {
        return { success: false, message: "No OTP found for this user" };
      }

      const { code, expiresAt, verified } = user.otp.email;
      
      if (verified) {
        return { success: false, message: "Email already verified" };
      }

      if (new Date() > expiresAt) {
        return { success: false, message: "OTP has expired" };
      }

      if (code !== otpCode) {
        return { success: false, message: "Invalid OTP" };
      }

      // Mark email as verified
      await User.findByIdAndUpdate(userId, {
        $set: {
          "otp.email.verified": true,
        },
      });

      return { success: true, message: "Email verified successfully" };
    } catch (error) {
      console.error("Error verifying email OTP:", error);
      return { success: false, message: "Failed to verify email OTP" };
    }
  }

  public static async verifyMobileOTP(userId: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.otp?.mobile) {
        return { success: false, message: "No OTP found for this user" };
      }

      const { code, expiresAt, verified } = user.otp.mobile;
      
      if (verified) {
        return { success: false, message: "Mobile already verified" };
      }

      if (new Date() > expiresAt) {
        return { success: false, message: "OTP has expired" };
      }

      if (code !== otpCode) {
        return { success: false, message: "Invalid OTP" };
      }

      // Mark mobile as verified
      await User.findByIdAndUpdate(userId, {
        $set: {
          "otp.mobile.verified": true,
        },
      });

      return { success: true, message: "Mobile verified successfully" };
    } catch (error) {
      console.error("Error verifying mobile OTP:", error);
      return { success: false, message: "Failed to verify mobile OTP" };
    }
  }

  public static async checkVerificationStatus(userId: string): Promise<{ emailVerified: boolean; mobileVerified: boolean }> {
    try {
      const user = await User.findById(userId);
      return {
        emailVerified: user?.otp?.email?.verified || false,
        mobileVerified: user?.otp?.mobile?.verified || false,
      };
    } catch (error) {
      console.error("Error checking verification status:", error);
      return { emailVerified: false, mobileVerified: false };
    }
  }
}