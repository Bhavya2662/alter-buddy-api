import { IPackagesProps } from "../interface";
import mongoose from "mongoose";

const PackagesSchema = new mongoose.Schema<IPackagesProps>(
     {
          categoryId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "Category",
               required: true,
          },
          description: { type: mongoose.Schema.Types.String },
          packageName: { type: mongoose.Schema.Types.String, required: true },
          packageType: { type: mongoose.Schema.Types.String, required: true },
          price: { type: mongoose.Schema.Types.Number, required: true },
          status: { type: mongoose.Schema.Types.Boolean },
          mentorId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "Mentor",
               required: true,
          },
          subServices: [
               {
                    title: { type: mongoose.Schema.Types.String },
                    price: { type: mongoose.Schema.Types.Number },
                    time: { type: mongoose.Schema.Types.String },
               },
          ],
     },
     {
          timestamps: true,
     }
);

export const Packages = mongoose.model("Packages", PackagesSchema);
