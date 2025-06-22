import mongoose, { Document, Schema } from "mongoose";

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  type: "user" | "product";
  reporter: mongoose.Types.ObjectId; // User who made the report
  reported: mongoose.Types.ObjectId; // User who was reported
  product?: mongoose.Types.ObjectId; // Product that was reported (if type is 'product')
  reason: string;
  description?: string;
  status: "pending" | "reviewed" | "dismissed";
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    type: {
      type: String,
      required: true,
      enum: ["user", "product"],
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reported: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    reason: {
      type: String,
      required: true,
      enum: ["inappropriate", "fake", "spam", "scam", "harassment", "other"],
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed"],
      default: "pending",
    },
    adminNotes: {
      type: String,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>("Report", ReportSchema);
