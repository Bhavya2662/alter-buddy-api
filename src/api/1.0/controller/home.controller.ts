import { Request, Response } from "express";
import { IControllerRoutes, IController } from "../../../interface";
import { Ok, UnAuthorized } from "../../../utils";

export class HomeController implements IController {
     public routes: IControllerRoutes[] = [];

     constructor() {
          this.routes.push({
               path: "/",
               handler: this.home,
               method: "GET",
          });
     }
     public async home(req: Request, res: Response) {
          try {
               return Ok(res, "Hello from api");
          } catch (err) {
               return UnAuthorized(res, err);
          }
     }
}
