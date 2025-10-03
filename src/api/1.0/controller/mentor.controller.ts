import { Request, Response } from "express";
import { IControllerRoutes, IController } from "../../../interface";
import { AuthForAdmin } from "../../../middleware";
import { Mentor } from "../../../model";
import { Ok, UnAuthorized } from "../../../utils";

export class MentorController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/mentor",
      handler: this.GetAllMentor,
      method: "GET",
    });
    this.routes.push({
      path: "/get-mentor/sub-category/:id",
      handler: this.GetMentorBySubCategoryId,
      method: "GET",
    });
    this.routes.push({
      path: "/get-mentor/category/:id",
      handler: this.GetMentorByCategoryId,
      method: "GET",
    });
  }

  public async GetAllMentor(req: Request, res: Response) {
    try {
      const allMentors = await Mentor.find({ status: true })
        .sort({ createdAt: -1 })
        .populate("category")
        .sort({ createdAt: -1 });
      
      // Filter mentors with complete profiles only
      const completeMentors = allMentors.filter(mentor => {
        return (
          mentor.auth?.username &&
          mentor.auth?.password &&
          mentor.contact?.email &&
          mentor.contact?.mobile &&
          mentor.contact?.address &&
          mentor.name?.firstName &&
          mentor.name?.lastName &&
          mentor.image &&
          mentor.languages && mentor.languages.length > 0 &&
          mentor.qualification && mentor.qualification.trim() !== ""
        );
      });
      
      return Ok(res, completeMentors);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorBySubCategoryId(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const allMentors = await Mentor.find({ subCategory: id })
        .populate("category")
        .sort({ createdAt: -1 });
      
      // Filter mentors with complete profiles only
      const completeMentors = allMentors.filter(mentor => {
        return (
          mentor.auth?.username &&
          mentor.auth?.password &&
          mentor.contact?.email &&
          mentor.contact?.mobile &&
          mentor.contact?.address &&
          mentor.name?.firstName &&
          mentor.name?.lastName &&
          mentor.image &&
          mentor.languages && mentor.languages.length > 0 &&
          mentor.qualification && mentor.qualification.trim() !== ""
        );
      });
      
      return Ok(res, completeMentors);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorByCategoryId(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const allMentors = await Mentor.find({ category: id })
        .populate("category")
        .sort({ createdAt: -1 });
      
      // Filter mentors with complete profiles only
      const completeMentors = allMentors.filter(mentor => {
        return (
          mentor.auth?.username &&
          mentor.auth?.password &&
          mentor.contact?.email &&
          mentor.contact?.mobile &&
          mentor.contact?.address &&
          mentor.name?.firstName &&
          mentor.name?.lastName &&
          mentor.image &&
          mentor.languages && mentor.languages.length > 0 &&
          mentor.qualification && mentor.qualification.trim() !== ""
        );
      });
      
      return Ok(res, completeMentors);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
