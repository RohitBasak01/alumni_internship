import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const resumeSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    personalInfo: {
      fullName: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      website: { type: String, trim: true, default: "" }
    },
    summary: {
      type: String,
      trim: true,
      default: ""
    },
    experience: [
      {
        title: { type: String, trim: true, required: true },
        company: { type: String, trim: true, required: true },
        location: { type: String, trim: true, default: "" },
        startDate: { type: String, trim: true, default: "" },
        endDate: { type: String, trim: true, default: "" },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true, default: "" }
      }
    ],
    education: [
      {
        institution: { type: String, trim: true, required: true },
        degree: { type: String, trim: true, required: true },
        fieldOfStudy: { type: String, trim: true, default: "" },
        startDate: { type: String, trim: true, default: "" },
        endDate: { type: String, trim: true, default: "" },
        grade: { type: String, trim: true, default: "" }
      }
    ],
    skills: {
      type: [String],
      default: []
    },
    projects: [
      {
        name: { type: String, trim: true, required: true },
        description: { type: String, trim: true, default: "" },
        link: { type: String, trim: true, default: "" },
        technologies: { type: [String], default: [] }
      }
    ],
    theme: {
      type: String,
      default: "modern" // e.g., 'modern', 'classic', 'minimal'
    }
  },
  {
    timestamps: true
  }
);

// Only one resume per user per institute
resumeSchema.index({ instituteId: 1, userId: 1 }, { unique: true });

resumeSchema.plugin(softDeletePlugin);

export default mongoose.model("Resume", resumeSchema);
