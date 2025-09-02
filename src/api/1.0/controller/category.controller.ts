import { Request, Response } from "express";
import { IControllerRoutes, IController, ICategoryProps } from "../../../interface";
import { AuthForAdmin } from "../../../middleware";
import { Category } from "../../../model";
import { Ok, UnAuthorized } from "../../../utils";

export class CategoryController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    // CATEGORY
    this.routes.push({
      path: "/category",
      handler: this.GetAllCategory,
      method: "GET",
    });
    this.routes.push({
      path: "/category/:id",
      handler: this.GetCategoryById,
      method: "GET",
    });
    this.routes.push({
      handler: this.UploadCategory,
      method: "POST",
      path: "/category",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.UpdateCategoryById,
      method: "PUT",
      path: "/category/:id",
      middleware: [AuthForAdmin],
    });
    this.routes.push({
      handler: this.DeleteCategoryById,
      method: "DELETE",
      path: "/category/:id",
      middleware: [AuthForAdmin],
    });
  }
  public async GetAllCategory(req: Request, res: Response) {
    try {
      const category = await Category.find().sort({ createdAt: -1 });
      return Ok(res, category);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetCategoryById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const category = await Category.findOne({ _id: id });
      return Ok(res, category);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UploadCategory(req: Request, res: Response) {
    try {
      const { title } = req.body;
      if (!title) {
        return UnAuthorized(res, "missing fields");
      } else {
        const category = await new Category({
          status: true,
          title,
        }).save();
        return Ok(res, `${category.title} is uploaded`);
      }
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdateCategoryById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updateCategory = await Category.findOneAndUpdate(
        { _id: id },
        { $set: { ...JSON.parse(req.body) } },
        { new: true }
      );
      return Ok(res, `${updateCategory.title} is updated`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeleteCategoryById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await Category.findByIdAndDelete({ _id: id });
      return Ok(res, `category is deleted`);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
