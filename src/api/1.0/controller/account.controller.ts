import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
import {
  AuthForMentor,
  AuthForUser,
  AuthForAdmin,
} from "../../../middleware/user.middleware";
import { Mentor, User } from "../../../model";
import {
  NotFound,
  Ok,
  UnAuthorized,
  getTokenFromHeader,
  verifyToken,
} from "../../../utils";
import bcrypt from "bcrypt";

export class AccountController implements IController {
  public routes: IControllerRoutes[] = [];
  constructor() {
    this.routes.push({
      handler: this.UserProfile,
      method: "GET",
      path: "/user/profile",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.UpdateUserProfile,
      method: "PUT",
      path: "/user/profile",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetUserById,
      method: "GET",
      path: "/user/profile/:id",
    });
    this.routes.push({
      handler: this.MentorProfile,
      method: "GET",
      path: "/mentor/profile",
      middleware: [AuthForMentor],
    });

    this.routes.push({
      handler: this.AdminProfile,
      method: "GET",
      path: "/admin/profile",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.DeactivateUserAccount,
      method: "PUT",
      path: "/user/deactivate",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetMentorById,
      method: "GET",
      path: "/mentor/profile/:id",
    });
    // Add plural routes for frontend compatibility
    this.routes.push({
      handler: this.UserProfile,
      method: "GET",
      path: "/users/profile",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.UpdateUserProfile,
      method: "PUT",
      path: "/users/profile",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetUserSessions,
      method: "GET",
      path: "/users/sessions",
      middleware: [AuthForUser],
    });
    this.routes.push({
      handler: this.GetUserBookings,
      method: "GET",
      path: "/users/bookings",
      middleware: [AuthForUser],
    });
  }

  public async UserProfile(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const user = await User.findOne({ _id: verified.id });
      return Ok(res, user);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetUserById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const user = await User.findById({ _id: id });
      return Ok(res, user);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async MentorProfile(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const mentor = await Mentor.findById({ _id: verified.id }).populate(
        "category"
      );
      return Ok(res, mentor);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const mentor = await Mentor.findById({ _id: id }).populate([
        {
          path: "category",
          model: "Category",
        },
      ]);
      return Ok(res, mentor);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async AdminProfile(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);
      const admin = await User.findById({ _id: verified.id });
      return Ok(res, admin);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdateUserProfile(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      if (!verified) {
        return UnAuthorized(res, "Invalid or expired token");
      }

      const user = await User.findById(verified.id);

      if (!user) {
        return NotFound(res, "User not found");
      }

      let updateData = { ...req.body };

      if (req.body.password) {
        const hashPassword = bcrypt.hashSync(req.body.password, 10);
        updateData.password = hashPassword;
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: updateData },
        { new: true }
      );

      if (!updatedUser) {
        return UnAuthorized(res, "Failed to update user");
      }

      return Ok(
        res,
        `${updatedUser.name?.firstName ?? "User"} your profile has been saved!`
      );
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async DeactivateUserAccount(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      if (!verified) {
        return UnAuthorized(res, "Invalid or expired token");
      }

      const user = await User.findById(verified.id);

      if (!user) {
        return NotFound(res, "User not found");
      }

      const { reason } = req.body;

      // Update user account to deactivated status
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 
          $set: { 
            block: true,
            deactivationReason: reason,
            deactivatedAt: new Date()
          } 
        },
        { new: true }
      );

      if (!updatedUser) {
        return UnAuthorized(res, "Failed to deactivate account");
      }

      return Ok(
        res,
        "Your account has been deactivated successfully. We're sorry to see you go!"
      );
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async GetUserSessions(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      if (!verified) {
        return UnAuthorized(res, "Invalid token");
      }

      // For now, return empty array - this can be implemented based on your session model
      return Ok(res, []);
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }

  public async GetUserBookings(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const verified = verifyToken(token);

      if (!verified) {
        return UnAuthorized(res, "Invalid token");
      }

      // For now, return empty array - this can be implemented based on your booking model
      return Ok(res, []);
    } catch (err) {
      console.log(err);
      return UnAuthorized(res, err);
    }
  }
}
