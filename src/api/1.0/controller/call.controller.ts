import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
import { SDK, Room } from "@100mslive/server-sdk";
import { Ok, UnAuthorized } from "../../../utils";
import { configDotenv } from "dotenv";
import { HMSService } from "../../../services/100ms.service";

configDotenv();

export class CallController implements IController {
     public routes: IControllerRoutes[] = [];

     constructor() {
          this.routes.push({
               handler: this.createRoom.bind(this),
               method: "GET",
               path: "/create-room",
          });
     }

     public async createRoom(req: Request, res: Response) {
          try {
               const roomConfig = await HMSService.getRoomConfigs();
               return Ok(res, roomConfig);
          } catch (err) {
               return UnAuthorized(res, err);
          }
     }
}
