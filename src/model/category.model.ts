import { ICategoryProps } from "../interface";
import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema<ICategoryProps>(
     {
          title: { type: mongoose.Schema.Types.String, required: true },
          status: { type: mongoose.Schema.Types.Boolean },
     },
     {
          timestamps: true,
     }
);

export const Category = mongoose.model<ICategoryProps>("Category", CategorySchema);
