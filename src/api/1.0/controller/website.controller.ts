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
}
