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
      path: "/reset-password",
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
      const { email, password, name, mobile }: IUserProps = req.body;

      if (!email || !password || !mobile || !password) {
        return UnAuthorized(res, "missing fields");
      }

      const user = await User.findOne({ email });

      if (user) {
        return UnAuthorized(res, "user is already registered");
      }
      const hashed = bcrypt.hashSync(password, 10);

      const newUser = await new User({
        acType: "USER",
        block: false,
        email,
        online: false,
        password: hashed,
        verified: false,
        mobile,
        name: {
          firstName: name.firstName,
          lastName: name.lastName,
        },
      }).save();
      await new BuddyCoins({
        balance: 0,
        userId: newUser._id,
      }).save();

      const token = jwt.sign(
        {
          id: newUser._id,
        },
        config.get("JWT_SECRET"),
        { expiresIn: config.get("JWT_EXPIRE") }
      );
      return Ok(res, {
        token,
        mobile: newUser.mobile,
        user: newUser,
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
      const { password, username }: IMentorAuthProps = req.body;
      if (!username || !password) {
        return UnAuthorized(res, "missing fields");
      }
      const mentor = await Mentor.findOne({
        "auth.username": username,
      });
      if (!mentor) {
        return UnAuthorized(res, "no user found");
      }
      if (mentor.acType !== "MENTOR") {
        return UnAuthorized(res, "access denied");
      }
      if (mentor.accountStatus.block) {
        return UnAuthorized(res, "your account has been blocked by admin");
      }
      const isPasswordValid = await bcrypt.compare(password, mentor.auth.password);
      if (!isPasswordValid) {
        return UnAuthorized(res, "wrong password");
      }
      const token = jwt.sign(
        {
          id: mentor._id,
        },
        config.get("JWT_SECRET"),
        { expiresIn: config.get("JWT_EXPIRE") }
      );
      await Mentor.findByIdAndUpdate(
        { _id: mentor._id },
        { $set: { "accountStatus.online": true } }
      );
      return Ok(res, {
        token,
        message: `${mentor.contact.mobile} is logged in`,
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async AdminSignIn(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return UnAuthorized(res, "missing fields");
      } else {
        const user = await User.findOne({ email });
        if (!user) {
          return UnAuthorized(res, "no user found");
        }
        if (user.acType !== "ADMIN") {
          return UnAuthorized(res, "access denied");
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
          user: `${user.mobile} is logged in`,
        });
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
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
        const mentor = await Mentor.findByIdAndUpdate({ _id: id }, req.body);
        return Ok(res, mentor);
      } else {
        return UnAuthorized(res, "access denied & invalid token");
      }
      return Ok(res, "Mentor updated successfully");
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
}
