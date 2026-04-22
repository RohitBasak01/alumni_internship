import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const postCommentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

const postReportSchema = new mongoose.Schema(
  {
    reporterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    _id: false
  }
);

const alumniPostSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    authorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: 140,
      default: ""
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    comments: {
      type: [postCommentSchema],
      default: []
    },
    reports: {
      type: [postReportSchema],
      default: []
    },
    status: {
      type: String,
      enum: ["active", "hidden"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

alumniPostSchema.plugin(softDeletePlugin);

export default mongoose.model("AlumniPost", alumniPostSchema);
