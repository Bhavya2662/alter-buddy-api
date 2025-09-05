import bodyParser from "body-parser";
import express, { Express, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import { errorHandler, notFoundMiddleware } from "./middleware";
import { registerRoutesV1 } from "./api";
import cookieParser from "cookie-parser";
import config from "config";
// import "./utils/cron.utils";

class App {
  express: Express;

  constructor() {
    this.express = express();
    this.middleware();
    this.connectDb();
    this.routes();
    this.useErrorHandler();
    this.useNotFoundMiddleware();
  }

  // Configure Express middleware.
  private middleware(): void {
    // Prevent Pinggy UI from showing
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader("X-Pinggy-No-Screen", "true");
      next();
    });
    
    // Body parser setup
    this.express.use(express.json({ limit: "50mb" }));
    this.express.use(express.urlencoded({ extended: true, limit: "50mb" }));
    
    this.express.set("ipaddr", "127.0.0.1");
    this.express.set("port", 8080);
    this.express.use(cookieParser());
    this.express.use(morgan("dev"));
    this.express.use(
      cors({
        origin: [
          // Local development
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3003",
          "http://localhost:3004",
          // Vercel deployments
          "https://alter-buddy-rant-app.vercel.app",
          "https://alter-buddy-admin-6do4gsj8n-bhavyas-projects-76b90fb1.vercel.app",
          "https://alter-buddy-frontend-git-main-bhavyas-projects-76b90fb1.vercel.app",
          "https://apna-mentor-admin-master-main.vercel.app"
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        credentials: true
      })
    );
    // this.express.use(createClient({}));
  }

  private useErrorHandler() {
    this.express.use(errorHandler);
  }

  private useNotFoundMiddleware() {
    this.express.use(notFoundMiddleware);
  }

  private routes(): void {
    registerRoutesV1(this.express);
  }

  private async connectDb() {
    try {
      const database = await mongoose.connect(config.get("DB_PATH"), {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      console.log("connected to database", database.connection.db.databaseName);
    } catch (err) {
      return console.log(err);
    }
  }
}

const app = new App();
const AppServer = app.express;

export default AppServer;
