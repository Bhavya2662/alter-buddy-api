import bodyParser from "body-parser";
import express, { Express, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import { errorHandler, notFoundMiddleware } from "./middleware";
import { corsOptions, securityHeaders, generalLimiter } from "./middleware/security.middleware";
import { registerRoutesV1 } from "./api";
import cookieParser from "cookie-parser";
import config from "config";
import { CronService } from "./services/cron.service";
import { initializeCronJobs } from "./utils/cron.utils";

class App {
  express: Express;

  constructor() {
    this.express = express();
    this.middleware();
    this.connectDb();
    this.routes();
    this.useErrorHandler();
    this.useNotFoundMiddleware();
    this.initializeCronJobs();
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
    // Security headers
    this.express.use(securityHeaders);
    
    // Rate limiting
    this.express.use(generalLimiter);
    
    // CORS configuration - Use the centralized CORS options from security middleware
    this.express.use(cors(corsOptions));
    
    // Additional CORS preflight handling for mobile compatibility
    this.express.options('*', (req: Request, res: Response) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers,rtk-query,RTK-Query');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.sendStatus(200);
    });
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

  private initializeCronJobs(): void {
    CronService.initializeCronJobs();
    initializeCronJobs(); // Initialize package session cron jobs
  }
}

// For Vercel deployment
const app = new App();
const AppServer = app.express;

// Export for Vercel
export default AppServer;

// Server startup is handled by bin/www.ts
