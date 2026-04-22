import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const announcementSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "News"
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 320,
      default: ""
    },
    imageUrl: {
      type: String,
      trim: true,
      default: ""
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published"
    },
    publishedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

announcementSchema.plugin(softDeletePlugin);

export default mongoose.model("Announcement", announcementSchema);
