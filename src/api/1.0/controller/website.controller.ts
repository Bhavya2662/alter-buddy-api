import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
import { AuthForAdmin } from "../../../middleware";
import { Chat, User } from "../../../model";
import { Ok, UnAuthorized } from "../../../utils";

export class WebsiteController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      handler: this.GetAllCalls,
      method: "GET",
      path: "/website/calls",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.GetAllUsers,
      method: "GET",
      path: "/website/users",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.GetUserById,
      method: "GET",
      path: "/website/users/:userId",
    });
    this.routes.push({
      handler: this.DeleteUserById,
      method: "DELETE",
      path: "/website/users/:id",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.DeactivateUser,
      method: "PUT",
      path: "/website/users/:id/deactivate",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.ReactivateUser,
      method: "PUT",
      path: "/website/users/:id/reactivate",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.GetDeactivatedUsers,
      method: "GET",
      path: "/website/deactivated-users",
      middleware: [AuthForAdmin],
    });
  }

  public async GetAllCalls(req: Request, res: Response) {
    try {
      const calls = await Chat.find()
        .sort({ createdAt: 1 })
        .populate([
          {
            path: "users.user",
            model: "User",
          },
          {
            path: "users.mentor",
            model: "Mentor",
            populate: [
              {
                path: "category",
                model: "Category",
              },
            ],
          },
        ]);
      return Ok(res, calls);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetAllUsers(req: Request, res: Response) {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      return Ok(res, users);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await User.findById({ _id: userId });
      return Ok(res, user);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeleteUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedUser = await User.findByIdAndDelete(id);
      if (!deletedUser) {
        return UnAuthorized(res, "User not found");
      }
      return Ok(res, { message: "User deleted successfully", user: deletedUser });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { type, reason } = req.body;
      
      if (!type || !['temporary', 'permanent'].includes(type)) {
        return UnAuthorized(res, "Invalid deactivation type. Must be 'temporary' or 'permanent'");
      }

      const user = await User.findById(id);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      if (user.acType === 'ADMIN') {
        return UnAuthorized(res, "Cannot deactivate admin accounts");
      }

      const deactivationData: any = {
        isDeactivated: true,
        type,
        deactivatedAt: new Date(),
        reason: reason || 'No reason provided'
      };

      // For temporary deactivation, set reactivation date to 90 days from now
      if (type === 'temporary') {
        const reactivationDate = new Date();
        reactivationDate.setDate(reactivationDate.getDate() + 90);
        deactivationData.reactivationDate = reactivationDate;
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { 
          $set: { 
            deactivation: deactivationData,
            block: true, // Also block the user
            online: false // Set offline
          } 
        },
        { new: true }
      );

      return Ok(res, {
        message: `User ${type === 'temporary' ? 'temporarily' : 'permanently'} deactivated`,
        user: updatedUser
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async ReactivateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id);
      if (!user) {
        return UnAuthorized(res, "User not found");
      }

      if (!user.deactivation?.isDeactivated) {
        return UnAuthorized(res, "User is not deactivated");
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { 
          $set: { 
            'deactivation.isDeactivated': false,
            'deactivation.markedForDeletion': false,
            block: false // Unblock the user
          },
          $unset: {
            'deactivation.reactivationDate': '',
            'deactivation.deletionScheduledAt': ''
          }
        },
        { new: true }
      );

      return Ok(res, {
        message: "User reactivated successfully",
        user: updatedUser
      });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetDeactivatedUsers(req: Request, res: Response) {
    try {
      const deactivatedUsers = await User.find({
        'deactivation.isDeactivated': true
      }).sort({ 'deactivation.deactivatedAt': -1 });
      
      return Ok(res, deactivatedUsers);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
