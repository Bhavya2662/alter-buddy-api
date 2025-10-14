import { Request, Response } from "express";
import { IControllerRoutes, IController, IPackagesProps } from "../../../interface";
import { AuthForAdmin, AuthForMentor } from "../../../middleware";
import { Packages } from "../../../model";
import { getTokenFromHeader, Ok, UnAuthorized, verifyToken } from "../../../utils";
import { ObjectId } from "mongodb";

export class PackagesController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/packages",
      handler: this.GetAllPackages,
      method: "GET",
    });
    this.routes.push({
      handler: this.CreateNewPackages,
      method: "POST",
      path: "/packages",
      middleware: [AuthForMentor],
    });
    // Alias route to match tests expecting /mentor/package
    this.routes.push({
      handler: this.CreateNewPackages,
      method: "POST",
      path: "/mentor/package",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.UpdatePackage,
      method: "PUT",
      path: "/packages/:id",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.DeletePackage,
      method: "DELETE",
      path: "/packages/:id",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetMyPackages,
      method: "GET",
      path: "/packages/my-packages",
      middleware: [AuthForMentor],
    });
    this.routes.push({
      handler: this.GetPackageByMentorId,
      method: "GET",
      path: "/packages/mentor/:mentorId",
    });
  }
  public async GetMyPackages(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const id = verifyToken(token);

      const packages = await Packages.find({ mentorId: id.id })
        .populate("categoryId")
        .populate("mentorId");
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
  public async GetAllPackages(req: Request, res: Response) {
    try {
      const packages = await Packages.find({})
        .populate("categoryId")
        .populate("mentorId");
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetPackageByMentorId(req: Request, res: Response) {
    try {
      const packages = await Packages.find({ mentorId: req.params.mentorId })
        .populate("categoryId")
        .populate("mentorId");
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async CreateNewPackages(req: Request, res: Response) {
    try {
      const {
        categoryId,
        packageName,
        packageType,
        description,
        price,
        subServices,
      }: IPackagesProps = req.body;
      console.log(req.body);
      if (!categoryId || !packageName || !packageType) {
        return UnAuthorized(res, "missing fields");
      }

      const token = getTokenFromHeader(req);
      const id = verifyToken(token);

      const packageExist = await Packages.findOne({
        categoryId,
        packageType,
        mentorId: id.id,
      });

      if (packageExist) {
        return UnAuthorized(res, "cannot create duplicate package");
      }
      const totalPrice = subServices.reduce(
        (acc, service) => acc + service.price,
        0
      );
      const packages = await new Packages({
        categoryId,
        packageName,
        packageType,
        price,
        description,
        status: false,
        mentorId: new ObjectId(`${id.id}`),
        subServices: subServices,
      }).save({ validateBeforeSave: true });
      console.log("NEW PACKAGES", packages);
      return Ok(res, `${packages.packageName} is created`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdatePackage(req: Request, res: Response) {
    try {
      const packages = await Packages.findByIdAndUpdate(
        { _id: req.params.id },
        { $set: { ...req.body } }
      );
      return Ok(res, `${packages.packageName} is updated`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeletePackage(req: Request, res: Response) {
    try {
      await Packages.findByIdAndDelete({ _id: req.params.id });
      return Ok(res, "package removed");
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
