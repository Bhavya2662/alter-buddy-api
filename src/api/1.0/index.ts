import { Express } from "express";
import {
  AccountController,
  AuthenticationController,
  BlogController,
  CallController,
  CategoryController,
  ChatSupportController,
  EmailController,
  FeaturesController,
  GeneralController,
  GroupSessionController,
  HomeController,
  MentorCallSchedule,
  MentorController,
  MentorWalletController,
  NotificationController,
  PackagesController,
  PostController,
  RantController,
  SessionPackageController,
  WalletController,
  WebsiteController,
} from "./controller";
import { IController } from "../../interface";

const routesHandler = (express: Express, controller: IController) => {
  for (const route of controller.routes) {
    const middleware = route.middleware || [];
    console.log(`Registering route: ${route.method} /api/1.0${route.path}`);
    switch (route.method) {
      case "GET":
        express.get(`/api/1.0${route.path}`, ...middleware, route.handler);
        break;
      case "POST":
        express.post(`/api/1.0${route.path}`, ...middleware, route.handler);
        break;
      case "PUT":
        express.put(`/api/1.0${route.path}`, ...middleware, (req: any, res: any, next: any) => {
          console.log(`PUT request received for /api/1.0${route.path}`);
          route.handler(req, res, next);
        });
        break;
      case "DELETE":
        express.delete(`/api/1.0${route.path}`, ...middleware, route.handler);
        break;
      case "PATCH":
        express.patch(`/api/1.0${route.path}`, ...middleware, route.handler);
        break;
      default:
        break;
    }
  }
};

export const registerRoutesV1 = (express: Express) => {
  routesHandler(express, new HomeController());
  routesHandler(express, new AccountController());
  routesHandler(express, new AuthenticationController());
  routesHandler(express, new CategoryController());
  routesHandler(express, new MentorController());
  routesHandler(express, new BlogController());
  routesHandler(express, new FeaturesController());
  routesHandler(express, new MentorCallSchedule());
  routesHandler(express, new MentorWalletController());
  routesHandler(express, new GroupSessionController());
  routesHandler(express, new SessionPackageController());
  routesHandler(express, new WebsiteController());
  routesHandler(express, new PostController());
  routesHandler(express, new WalletController());
  routesHandler(express, new NotificationController());
  routesHandler(express, new RantController());
  routesHandler(express, new PackagesController());
  routesHandler(express, new CallController());
  routesHandler(express, new EmailController());
  routesHandler(express, new ChatSupportController());
  routesHandler(express, new GeneralController());
};
