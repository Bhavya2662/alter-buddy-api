import { Request, Response } from "express";
import { IController, IControllerRoutes } from "../../../interface";
// import HMS from "@100mslive/server-sdk";
import { Ok, UnAuthorized } from "../../../utils";
import { configDotenv } from "dotenv";
import { HMSService } from "../../../services/100ms.service";
import { AuthForUser } from "../../../middleware";
import axios from "axios";
import { v4 as uuid } from "uuid";

configDotenv();

export class CallController implements IController {
     public routes: IControllerRoutes[] = [];

     constructor() {
          this.routes.push({
               handler: this.createRoom.bind(this),
               method: "GET",
               path: "/create-room",
               middleware: [AuthForUser],
          });
     }

     public async createRoom(req: Request, res: Response) {
          try {
               // Create a simple room configuration for testing
               const roomConfig = {
                    roomId: uuid(),
                    roomName: `test-room-${Date.now()}`,
                    description: "Test room for 100ms integration",
                    template_id: process.env.REACT_APP_100MD_SDK_VIDEO_TEMPLATE || "66a096efad8abf3a324d273a",
                    success: true
               };
               
               return Ok(res, roomConfig);
          } catch (err) {
               return UnAuthorized(res, err);
          }
     }
}
