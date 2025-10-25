import { Request, Response } from "express";
import { SessionPackage } from "../../../model/session-package.model";
import { Ok, UnAuthorized } from "../../../utils";
import { IController, IControllerRoutes } from "../../../interface";
import { AuthForMentor, AuthForUser } from "../../../middleware";

export class SessionPackageController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes = [
      {
        path: "/session/package",
        method: "POST",
        handler: this.CreatePackage,
        middleware: [AuthForUser],
      },
      {
        path: "/session/package/:userId",
        method: "GET",
        handler: this.GetUserPackages,
        middleware: [AuthForUser],
      },
      {
        path: "/session/package/use/:packageId",
        method: "PUT",
        handler: this.UseSessionFromPackage,
        middleware: [AuthForUser],
      },
      {
        path: "/mentor/packages/:mentorId",
        method: "GET",
        handler: this.GetMentorCreatedPackages,
        middleware: [],
      },
      {
        path: "/session/package/:id",
        method: "PATCH",
        handler: this.UpdatePackage,
        middleware: [AuthForMentor],
      },
      {
        path: "/session/package/:id",
        method: "DELETE",
        handler: this.DeletePackage,
        middleware: [AuthForMentor],
      },
      {
        path: "/session/packages/all",
        method: "GET",
        handler: this.GetAllTemplatePackages,
        middleware: [AuthForUser],
      },
    ];
  }

  public async CreatePackage(req: Request, res: Response) {
    try {
      const {
        userId,
        mentorId,
        categoryId,
        type,
        totalSessions,
        price,
        expiryDate,
        duration,
      } = req.body;

      // Derive authenticated user id from middleware (AuthForUser)
      const authedUserId = (req as any)?.user?.id;
      let effectiveUserId = userId;

      // If userId is provided but does not match the authenticated user, block the request
      if (effectiveUserId && authedUserId && effectiveUserId !== authedUserId) {
        return UnAuthorized(res, "Access denied: cannot create package for another user");
      }

      // If userId is not provided but user is authenticated, default to the authenticated user
      if (!effectiveUserId && authedUserId) {
        effectiveUserId = authedUserId;
      }

      // For mentor-created packages (templates), userId is optional
      // For user-purchased packages, userId is required
      const packageData: any = {
        mentorId,
        categoryId,
        type,
        totalSessions,
        remainingSessions: totalSessions,
        price,
        status: effectiveUserId ? "active" : "template", // Active for user-owned, template for mentor-created
      };

      // Only add userId if resolved (for user purchases)
      if (effectiveUserId) {
        packageData.userId = effectiveUserId;
      }

      // Add optional fields
      if (expiryDate) {
        packageData.expiryDate = expiryDate;
      }
      if (duration) {
        packageData.duration = duration;
      }

      const packageDoc = new SessionPackage(packageData);
      const saved = await packageDoc.save();
      return Ok(res, saved);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetUserPackages(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { type } = req.query; // Optional session type filter
      
      const filter: any = {
        userId,
        status: "active",
      };
      
      // Add type filter if provided
      if (type && ["chat", "audio", "video"].includes(type as string)) {
        filter.type = type;
      }
      
      const packages = await SessionPackage.find(filter)
        .sort({ createdAt: -1 })
        .populate("mentorId categoryId");
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UseSessionFromPackage(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const pkg = await SessionPackage.findById(packageId);

      if (!pkg) return UnAuthorized(res, "Package not found");
      if (pkg.remainingSessions <= 0)
        return UnAuthorized(res, "No remaining sessions");

      pkg.remainingSessions -= 1;
      if (pkg.remainingSessions === 0) pkg.status = "expired";
      await pkg.save();

      return Ok(res, pkg);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorCreatedPackages(req: Request, res: Response) {
    try {
      const { mentorId } = req.params;

      // Only get template packages created by the mentor (not user-purchased packages)
      const packages = await SessionPackage.find({ 
        mentorId, 
        status: "template" 
      }).populate("categoryId");
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdatePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await SessionPackage.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!updated) return UnAuthorized(res, "Package not found");

      return Ok(res, updated);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeletePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await SessionPackage.findByIdAndDelete(id);
      if (!deleted) return UnAuthorized(res, "Package not found");

      return Ok(res, { message: "Deleted successfully" });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetAllTemplatePackages(req: Request, res: Response) {
    try {
      const { categoryId, type } = req.query;
      
      const filter: any = {
        status: "template"
      };
      
      // Add optional filters
      if (categoryId) {
        filter.categoryId = categoryId;
      }
      if (type && ["chat", "audio", "video"].includes(type as string)) {
        filter.type = type;
      }
      
      const packages = await SessionPackage.find(filter)
        .populate("mentorId", "name category")
        .populate("categoryId", "title")
        .sort({ createdAt: -1 });
      
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
