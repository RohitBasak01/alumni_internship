import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const referralSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true
    },
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    candidateName: {
      type: String,
      required: true,
      trim: true
    },
    candidateEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    candidatePhone: {
      type: String,
      trim: true,
      default: ""
    },
    candidateResume: {
      type: String,
      trim: true,
      default: ""
    },
    referralNote: {
      type: String,
      trim: true,
      default: ""
    },
    relationship: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "rejected"],
      default: "pending"
    },
    adminNote: {
      type: String,
      trim: true,
      default: ""
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate referrals for same candidate+job combo
referralSchema.index({ jobId: 1, candidateEmail: 1 }, { unique: true });

referralSchema.plugin(softDeletePlugin);

export default mongoose.model("Referral", referralSchema);
