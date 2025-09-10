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
    // Remove hardcoded port setting - let Railway handle PORT via environment variable
    this.express.use(cookieParser());
    this.express.use(morgan("dev"));
    // CORS configuration - Use environment variable or allow all origins
    const corsOrigin = process.env.CORS_ORIGIN || config.get("CORS_ORIGIN") || "*";
    this.express.use(
      cors({
origin: ["https://alter-buddy-frontend.vercel.app"]
,        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
      // Fix Mongoose deprecation warning
      mongoose.set('strictQuery', false);
      
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
