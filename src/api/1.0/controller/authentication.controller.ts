import { Request, Response } from "express";
import {
  IControllerRoutes,
  IController,
  ILoginProps,
  IMentorAuthProps,
  IMentorProps,
} from "../../../interface";
import { Mentor, User, BuddyCoins } from "../../../model";
import { Ok, UnAuthorized, getTokenFromHeader, verifyToken } from "../../../utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";
import { IUserProps } from "interface/user.interface";
import { AuthForAdmin, AuthForMentor, AuthForUser } from "../../../middleware";
import Nodemailer, { SendMailOptions } from "nodemailer";
import { OTPService } from "../../../services/otp.service";
import { DeactivationService } from "../../../services/deactivation.service";

export class AuthenticationController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/sign-in",
      handler: this.UserSignIn,
      method: "PUT",
    });
    this.routes.push({
      path: "/sign-up",
      handler: this.UserSignUp,
      method: "POST",
    });
    this.routes.push({
      path: "/sign-out",
      handler: this.UserSignOut,
      method: "PUT",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.MentorSignIn,
      method: "PUT",
      path: "/mentor/sign-in",
    });
    this.routes.push({
      path: "/mentor/:id",
      handler: this.DeleteMentor,
      method: "DELETE",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      path: "/mentor/:id/status",
      handler: this.UpdateMentorStatus,
      method: "PATCH",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      path: "/mentor/update/:id",
      handler: this.UpdateMentor,
      method: "PUT",
      // middleware: [AuthForAdmin, AuthForMentor],
    });

    this.routes.push({
      handler: this.AdminSignIn,
      method: "PUT",
      path: "/admin/sign-in",
    });
    this.routes.push({
      handler: this.AdminSignOut,
      method: "PUT",
      path: "/admin/sign-out",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.AdminTest,
      method: "GET",
      path: "/admin/test",
    });
    this.routes.push({
      handler: this.AdminDashboard,
      method: "GET",
      path: "/admin/dashboard",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.MentorTest,
      method: "GET",
      path: "/mentor/test",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.MentorSignUp,
      method: "POST",
      path: "/mentor/sign-up",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.MentorSignOut,
      method: "POST",
      path: "/mentor/sign-out",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.UserForgotPassword,
      method: "POST",
      path: "/forgot-password-mail",
    });
    this.routes.push({
      handler: this.ValidateResetToken,
      method: "GET",
      path: "/validate-reset-token",
    });
    this.routes.push({
      handler: this.UserResetPassword,
      method: "PUT",
      path: "/user/reset-password",
    });
    this.routes.push({
      handler: this.VerifyEmailOTP,
      method: "POST",
      path: "/user/verify-email-otp",
    });
    this.routes.push({
      handler: this.VerifyMobileOTP,
      method: "POST",
      path: "/user/verify-mobile-otp",
    });
    this.routes.push({
      handler: this.ResendOTP,
      method: "POST",
      path: "/user/resend-otp",
    });
    // Add auth routes for frontend compatibility
    this.routes.push({
      handler: this.UserForgotPassword,
      method: "POST",
      path: "/auth/forgot-password",
    });
    this.routes.push({
      handler: this.ValidateResetToken,
      method: "POST",
      path: "/auth/validate-password",
    });
    this.routes.push({
      handler: this.ChangePassword,
      method: "PUT",
      path: "/auth/change-password",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.DeactivateUserAccount,
      method: "PUT",
      path: "/user/deactivate",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.ReactivateUserAccount,
      method: "PUT",
      path: "/user/reactivate",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.AdminDeactivateUser,
      method: "PUT",
      path: "/admin/deactivate-user/:userId",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.AdminReactivateUser,
      method: "PUT",
      path: "/admin/reactivate-user/:userId",
      middleware: [AuthForAdmin],
    });
  }
  public async UserSignIn(req: Request, res: Response) {
    try {
      const { mobileOrEmail, password }: ILoginProps = req.body;
      if (!mobileOrEmail || !password) {
        return UnAuthorized(res, "missing fields");
      }
      const user = await User.findOne({
        $or: [{ mobile: mobileOrEmail }, { email: mobileOrEmail }],
      });
      if (!user) {
        return UnAuthorized(res, "no user found");
      }
      if (user.acType !== "USER") {
        return UnAuthorized(res, "access denied");
      }
      
      // Check if user email is verified
      if (!user.verified) {
        return UnAuthorized(res, "Please verify your email before logging in. Check your inbox for the verification code.");
      }
      
      // Check if user account is deactivated (before block check for specific messages)
      if (user.deactivation?.isDeactivated) {
        const deactivationType = user.deactivation.type;
        const reason = user.deactivation.reason || 'No reason provided';
        
        if (deactivationType === 'permanent') {
          return UnAuthorized(res, `Your account has been permanently deactivated. Reason: ${reason}. Please contact support for assistance.`);
        } else if (deactivationType === 'temporary') {
          // For temporary deactivation, allow user to login anytime and automatically reactivate
          await User.findByIdAndUpdate(
            user._id,
            { 
              $set: { 
                'deactivation.isDeactivated': false,
                'deactivation.markedForDeletion': false,
                block: false
              },
              $unset: {
                'deactivation.reactivationDate': '',
                'deactivation.deletionScheduledAt': ''
              }
            }
          );
          // Continue with normal login process
        }
      }
      
      // Check if user is blocked (after deactivation check)
      if (user.block) {
        return UnAuthorized(res, "your account has been blocked by admin");
      }
      
      if (!bcrypt.compareSync(password, user.password)) {
        return UnAuthorized(res, "wrong password");
      }
      const token = jwt.sign(
        {
          id: user._id,
        },
        config.get("JWT_SECRET"),
        { expiresIn: config.get("JWT_EXPIRE") }
      );
      await User.findByIdAndUpdate(
        { _id: user._id },
        { $set: { online: true } }
      );
      return Ok(res, {
        token,
        message: `${user.name.firstName} ${user.name.lastName} is logged in`,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UserSignUp(req: Request, res: Response) {
    try {
      console.log('=== UserSignUp method called ===');
      console.log('Request body:', req.body);
      const { email, password, name, mobile }: {
        email: string;
        password: string;
        name: { firstName: string; lastName: string };
        mobile?: string;
      } = req.body;
      console.log('Extracted fields:', { email, password: password ? 'present' : 'missing', name, mobile });

      if (!email || !password || !name) {
        console.log('Missing fields detected:', { email: !!email, password: !!password, name: !!name });
        return UnAuthorized(res, "missing fields");
      }

      // Check if user already exists with this email
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        return UnAuthorized(res, "user is already registered with this email");
      }



      const hashed = bcrypt.hashSync(password, 10);

      const newUser = await new User({
        acType: "USER",
        block: false,
        email: email,
        mobile: mobile,
        online: false,
        password: hashed,
        verified: false,
        name: {
          firstName: name.firstName,
          lastName: name.lastName,
        },
      }).save();
      
      await new BuddyCoins({
        balance: 0,
        userId: newUser._id,
      }).save();

      // Generate and send only email OTP (no mobile OTP)
      const emailOTPResult = await OTPService.generateAndSendEmailOTP(newUser._id.toString(), email);

      const token = jwt.sign(
        {
          id: newUser._id,
        },
        config.get("JWT_SECRET"),
        { expiresIn: config.get("JWT_EXPIRE") }
      );

      return Ok(res, {
        token,
        userId: newUser._id,
        message: "User registered successfully. Please verify your email with the OTP sent.",
        otpStatus: {
          email: emailOTPResult,
        },
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
        },
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeleteMentor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const mentor = await Mentor.findByIdAndDelete({ _id: id });
      return Ok(res, `Mentor deleted!`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async MentorSignUp(req: Request, res: Response) {
    try {
      const {
        auth,
        category,
        contact,
        name,
        specialists,
        videoLink,
        description,
        languages,
        image,
        qualification,
      }: IMentorProps = req.body;
      if (
        !auth.password ||
        !auth.username
        // !category ||
        // !contact.email ||
        // !name.firstName ||
        // !name.lastName ||
        // !languages
      ) {
        return UnAuthorized(res, "missing fields");
      } else {
        const mentor = await Mentor.findOne({
          "auth.username": auth.username,
        });
        if (mentor) {
          return UnAuthorized(res, "mentor is already registered");
        }

        const newMentor = await new Mentor({
          ...req.body,
          auth: {
            ...req.body.auth,
            password: bcrypt.hashSync(auth.password, 10),
          },
          videoLink: "https://youtu.be/samaSr6cmLU?si=j0c7p5n6E8HCushK",
          status: true,
        }).save();

        var mailOptions: SendMailOptions = {
          from: "alterbuddy8@gmail.com",
          to: newMentor.contact.email,
          subject: `${newMentor.name.firstName} Welcome to AlterBuddy! start your journey from here`,
          html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Registration Successful</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            color: #333333;
            line-height: 1.6;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 10px;
        }
        h1 {
            color: #601E28;
        }
        p {
            margin-bottom: 20px;
        }
        .important {
            font-weight: bold;
            color: #e74c3c;
        }
        .footer {
            margin-top: 20px;
            font-size: 0.9em;
            color: #777777;
        }
    </style>
</head>
<body>
    <div class="container">
        <p>Hello ${name.firstName} ${name.lastName},</p>

        <p>Welcome to AlterBuddy! We are excited to inform you that your account for mentoring has been registered successfully.</p>

        <p class="important">Please make sure to keep this email safe, as it contains your account credentials:</p>

        <h1>Your Username: ${newMentor.auth.username}</h1>
        <h1>Your Password: ${newMentor.auth.password}</h1>

        <p>For security reasons, please do not share your password with anyone.</p>

        <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>

        <p class="footer">Thank you for being a part of our community!</p>
    </div>
</body>
</html>
`,
        };
        var transporter = Nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 587, // TLS port
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: true,
          },
        });
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
        const token = jwt.sign(
          {
            id: newMentor._id,
          },
          config.get("JWT_SECRET"),
          { expiresIn: config.get("JWT_EXPIRE") }
        );
        return Ok(res, `${newMentor.name.firstName} is signed up successfully`);
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UserSignOut(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      res.removeHeader("authorization");
      const verified = verifyToken(token);
      const user = await User.findByIdAndUpdate(
        { _id: verified.id },
        { $set: { online: false } }
      );
      await User.findById({ _id: user._id });
      return Ok(res, `logged out`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async MentorSignIn(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      // Check if mentor exists
      const mentor = await Mentor.findOne({ 
        "contact.email": email.toLowerCase(),
        "accountStatus.block": false,
        "accountStatus.verification": true
      });

      if (!mentor) {
        return res.status(401).json({
          success: false,
          message: "Invalid mentor credentials"
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, mentor.auth.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid mentor credentials"
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: mentor._id,
          email: mentor.contact.email,
          role: 'mentor',
          type: 'mentor'
        },
        config.get("JWT_SECRET"),
        { expiresIn: "30d" }
      );

      // Set secure cookie for cross-domain authentication
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'strict' | 'lax' | 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
      };

      res.cookie('mentorToken', token, cookieOptions);

      return res.status(200).json({
        success: true,
        message: "Mentor login successful",
        data: {
          token,
          user: {
            id: mentor._id,
            email: mentor.contact.email,
            name: mentor.name,
            role: 'mentor'
          }
        }
      });

    } catch (error) {
      console.error('Mentor login error:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  public async AdminSignIn(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }

      // Check if admin exists
      const admin = await User.findOne({ 
        email: email.toLowerCase(),
        acType: 'ADMIN',
        block: false,
        'deactivation.isDeactivated': { $ne: true }
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials"
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials"
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: admin._id,
          email: admin.email,
          role: admin.acType,
          type: 'admin'
        },
        config.get("JWT_SECRET"),
        { expiresIn: "30d" }
      );

      // Set secure cookie for cross-domain authentication - Mobile compatible
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'strict' | 'lax' | 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        // Remove domain restriction for mobile compatibility
        domain: undefined
      };

      res.cookie('adminToken', token, cookieOptions);

      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: {
          token,
          user: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.acType
          }
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  public async AdminTest(req: Request, res: Response) {
    console.log('AdminTest endpoint hit!');
    return Ok(res, { message: 'Admin test endpoint working' });
  }

  public async AdminDashboard(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      
      // Get dashboard statistics
      const totalUsers = await User.countDocuments({ acType: 'USER' });
      const totalMentors = await Mentor.countDocuments();
      const activeUsers = await User.countDocuments({ acType: 'USER', online: true });
      const activeMentors = await Mentor.countDocuments({ 'accountStatus.online': true });
      const blockedUsers = await User.countDocuments({ acType: 'USER', block: true });
      const deactivatedUsers = await User.countDocuments({ 'deactivation.isDeactivated': true });
      
      const dashboardData = {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers,
          deactivated: deactivatedUsers
        },
        mentors: {
          total: totalMentors,
          active: activeMentors
        },
        admin: {
          id: verified.id,
          email: verified.email
        }
      };
      
      return Ok(res, dashboardData);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async AdminSignOut(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      res.removeHeader("authorization");
      const verified = verifyToken(token);
      
      // Update admin online status to false
      await User.findByIdAndUpdate(
        { _id: verified.id },
        { $set: { online: false } }
      );
      
      // Clear the admin cookie
      res.clearCookie('adminToken');
      
      return Ok(res, "Admin logged out successfully");
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async MentorTest(req: Request, res: Response) {
    console.log('MentorTest endpoint hit!');
    return Ok(res, { message: 'Mentor test endpoint working' });
  }

  public async MentorSignOut(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      res.removeHeader("authorization");
      const verified = verifyToken(token);
      await Mentor.findByIdAndUpdate(
        { _id: verified.id },
        { $set: { "accountStatus.online": false } }
      );
      return Ok(res, `logout successful`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public UpdateMentor = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(id);
      
      const token = getTokenFromHeader(req);
      res.removeHeader("authorization");
      const verified = verifyToken(token);
      console.log('====================================');
      console.log(verified);
      console.log('====================================');
      if (verified.id) {
        const updatedMentor = await Mentor.findByIdAndUpdate({ _id: id }, req.body, { new: true });
        
        // Emit real-time update to all connected clients
        const { io } = require('../../../bin/www');
        if (io) {
          io.emit('mentorStatusUpdated', {
            mentorId: id,
            accountStatus: updatedMentor.accountStatus,
            inCall: updatedMentor.inCall,
            isUnavailable: updatedMentor.isUnavailable,
            status: updatedMentor.status
          });
        }
        
        return Ok(res, "Mentor updated successfully");
      } else {
        return UnAuthorized(res, "access denied & invalid token");
      }
    } catch (err) {
      console.log(err);
      
      return UnAuthorized(res, err);
    }
  };

  public UpdateMentorStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { online, inCall, isUnavailable } = req.body;
      
      // No need for additional token verification since AuthForAdmin middleware handles it

      const updateData: any = {};
      if (typeof online === 'boolean') {
        updateData['accountStatus.online'] = online;
      }
      if (typeof inCall === 'boolean') {
        updateData.inCall = inCall;
      }
      if (typeof isUnavailable === 'boolean') {
        updateData.isUnavailable = isUnavailable;
      }

      const updatedMentor = await Mentor.findByIdAndUpdate(
        id, 
        { $set: updateData }, 
        { new: true }
      );

      if (!updatedMentor) {
        return UnAuthorized(res, "Mentor not found");
      }

      // Emit real-time update to all connected clients
      const { io } = require('../../../bin/www');
      if (io) {
        io.emit('mentorStatusUpdated', {
          mentorId: id,
          accountStatus: updatedMentor.accountStatus,
          inCall: updatedMentor.inCall,
          isUnavailable: updatedMentor.isUnavailable,
          status: updatedMentor.status
        });
      }

      return Ok(res, {
        message: "Mentor status updated successfully",
        mentor: {
          _id: updatedMentor._id,
          accountStatus: updatedMentor.accountStatus,
          inCall: updatedMentor.inCall,
          isUnavailable: updatedMentor.isUnavailable
        }
      });
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  };

  public async UserForgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return UnAuthorized(res, "please enter email first");
      } else {
        const user = await User.findOne({ email });
        if (!user) {
          return UnAuthorized(res, "there is no user with this email");
        } else {
          const token = jwt.sign(
            {
              email,
            },
            config.get("JWT_SECRET"),
            { expiresIn: "15m" }
          );
          const resetLink = `${process.env.FRONTEND_URL || "https://alterbuddy.com"}/reset-password?token=${token}`;
          var mailOptions: SendMailOptions = {
            from: "alterbuddy8@gmail.com",
            to: user.email,
            subject: `${user.name.firstName} Welcome to AlterBuddy! Reset Your password!`,
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            color: #d45561;
        }
        .header h1 {
            margin: 0;
        }
        .content {
            margin: 20px 0;
            text-align: center;
        }
        .content p {
            font-size: 16px;
            color: #333333;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #d45561;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #aaaaaa;
        }
            a {
            color:#fff!important;
            }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <p>Hello, ${user.name.firstName} ${user.name.lastName}</p>
            <p>It looks like you requested to reset your password. Click the button below to reset it:</p>
            <a href=${resetLink} class="button">Reset Password</a>
            <p>This Link is valid for only 15 minutes If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`,
          };

          var transporter = Nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 587, // TLS port
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            tls: {
              rejectUnauthorized: true,
            },
          });
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log("Email sent: " + info.response);
            }
          });
          return Ok(
            res,
            `Hey! ${user.name.firstName} we identified you & we have sent an email for reset your password`
          );
        }
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  public async ValidateResetToken(req: Request, res: Response) {
    try {
      const resetToken: string = req.query.resetToken.toString();
      const verify = verifyToken(resetToken);
      if (verify) {
        return Ok(res, "DONE");
      }
    } catch (err) {
      if (err.message === "jwt expired") {
        return UnAuthorized(
          res,
          "reset token is expired please request new one!"
        );
      } else return UnAuthorized(res, err);
    }
  }

  public async UserResetPassword(req: Request, res: Response) {
    try {
      const {
        password,
        newPassword,
        token,
      }: {
        password: string;
        newPassword: string;
        token: string;
      } = req.body;

      if (!password || !newPassword) {
        return UnAuthorized(res, "missing fields");
      } else {
        if (password !== newPassword) {
          return UnAuthorized(res, "both password should be matched");
        } else {
          if (!token) {
            return UnAuthorized(res, "TOKEN_NOT_EXIST");
          }
          const verify = verifyToken(token);
          if (verify.email) {
            const hashPassword = bcrypt.hashSync(newPassword, 10);
            const user = await User.findOneAndUpdate(
              { email: verify.email },
              {
                $set: {
                  password: hashPassword,
                },
              }
            );
            return Ok(
              res,
              `${user.name.firstName} ${user.name.lastName} your account has been recover successfully!`
            );
          } else {
            return UnAuthorized(res, "something went wrong");
          }
        }
      }
    } catch (err) {
      if (err.message === "jwt expired") {
        return UnAuthorized(res, "TOKEN_EXPIRE");
      } else return UnAuthorized(res, err);
    }
  }

  public async DeactivateUserAccount(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      
      if (!verified || !verified.id) {
        return UnAuthorized(res, "Invalid or expired token");
      }

      const { type, reason, reactivationDate } = req.body;
      
      if (!type || !['temporary', 'permanent'].includes(type)) {
        return UnAuthorized(res, "Invalid deactivation type. Use 'temporary' or 'permanent'");
      }

      let result;
      if (type === 'temporary') {
        const reactivationDateObj = reactivationDate ? new Date(reactivationDate) : undefined;
        result = await DeactivationService.deactivateTemporarily(verified.id, reason, reactivationDateObj);
      } else {
        result = await DeactivationService.deactivatePermanently(verified.id, reason);
      }

      if (!result) {
        return UnAuthorized(res, "Failed to deactivate account");
      }

      return Ok(res, {
        message: `Account deactivated ${type === 'temporary' ? 'temporarily' : 'permanently'}`,
        deactivation: result.deactivation,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeactivateMentorAccount(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      
      if (!verified || !verified.id) {
        return UnAuthorized(res, "Invalid or expired token");
      }

      const { reason } = req.body;
      
      // Update mentor to mark as deactivated
      const mentor = await Mentor.findByIdAndUpdate(
        { _id: verified.id },
        { 
          $set: { 
            "accountStatus.block": true,
            deactivationReason: reason 
          } 
        },
        { new: true }
      );

      if (!mentor) {
        return UnAuthorized(res, "Mentor not found");
      }

      // Remove auth token
      res.removeHeader("authorization");
      
      return Ok(res, "Account deactivated successfully");
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async VerifyEmailOTP(req: Request, res: Response) {
    try {
      const { userId, otp } = req.body;

      if (!userId || !otp) {
        return UnAuthorized(res, "Missing userId or OTP");
      }

      const result = await OTPService.verifyEmailOTP(userId, otp);
      
      if (result.success) {
        return Ok(res, {
          message: "Email verified successfully",
          verified: true,
        });
      } else {
        return UnAuthorized(res, result.message);
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async VerifyMobileOTP(req: Request, res: Response) {
    try {
      const { userId, otp } = req.body;

      if (!userId || !otp) {
        return UnAuthorized(res, "Missing userId or OTP");
      }

      const result = await OTPService.verifyMobileOTP(userId, otp);
      
      if (result.success) {
        return Ok(res, {
          message: "Mobile verified successfully",
          verified: true,
        });
      } else {
        return UnAuthorized(res, result.message);
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async ResendOTP(req: Request, res: Response) {
    try {
      const { userId, type } = req.body; // type: 'email' or 'mobile'

      if (!userId || !type) {
        return UnAuthorized(res, "Missing userId or type");
      }

      const user = await User.findById(userId);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      let result;
      if (type === 'email') {
        result = await OTPService.generateAndSendEmailOTP(userId, user.email);
      } else if (type === 'mobile') {
        result = await OTPService.generateAndSendMobileOTP(userId, user.mobile);
      } else {
        return UnAuthorized(res, "Invalid type. Use 'email' or 'mobile'");
      }

      return Ok(res, {
        message: `OTP resent to ${type} successfully`,
        result,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  /**
   * User self-reactivation (only for temporary deactivation)
   */
  public async ReactivateUserAccount(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      const user = await User.findById(verified.id);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      if (!user.deactivation?.isDeactivated) {
        return UnAuthorized(res, "Account is not deactivated");
      }

      if (user.deactivation.type === 'permanent') {
        return UnAuthorized(res, "Cannot reactivate permanently deactivated account. Contact admin.");
      }

      const result = await DeactivationService.reactivateUser(verified.id);
      if (!result) {
        return UnAuthorized(res, "Failed to reactivate account");
      }

      return Ok(res, {
        message: "Account reactivated successfully",
        user: result,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  /**
   * Admin deactivate user
   */
  public async AdminDeactivateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { type, reason, reactivationDate } = req.body;

      if (!userId) {
        return UnAuthorized(res, "User ID is required");
      }

      if (!type || !['temporary', 'permanent'].includes(type)) {
        return UnAuthorized(res, "Invalid deactivation type. Use 'temporary' or 'permanent'");
      }

      const user = await User.findById(userId);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      let result;
      if (type === 'temporary') {
        const reactivationDateObj = reactivationDate ? new Date(reactivationDate) : undefined;
        result = await DeactivationService.deactivateTemporarily(userId, reason, reactivationDateObj);
      } else {
        result = await DeactivationService.deactivatePermanently(userId, reason);
      }

      if (!result) {
        return UnAuthorized(res, "Failed to deactivate user account");
      }

      return Ok(res, {
        message: `User account deactivated ${type === 'temporary' ? 'temporarily' : 'permanently'}`,
        user: result,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  /**
   * Admin reactivate user
   */
  public async AdminReactivateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return UnAuthorized(res, "User ID is required");
      }

      const user = await User.findById(userId);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      if (!user.deactivation?.isDeactivated) {
        return UnAuthorized(res, "User account is not deactivated");
      }

      const result = await DeactivationService.reactivateUser(userId);
      if (!result) {
        return UnAuthorized(res, "Failed to reactivate user account");
      }

      return Ok(res, {
        message: "User account reactivated successfully",
        user: result,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async ChangePassword(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      if (!verified) {
        return UnAuthorized(res, "Invalid token");
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return UnAuthorized(res, "Current password and new password are required");
      }

      const user = await User.findById(verified.id);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return UnAuthorized(res, "Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await User.findByIdAndUpdate(user._id, {
        password: hashedNewPassword,
      });

      return Ok(res, "Password changed successfully");
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }
}
