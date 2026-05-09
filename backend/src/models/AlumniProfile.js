import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const alumniProfileSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gender: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    mobileNumber: {
      type: String,
      trim: true,
      default: "",
    },
    profilePhotoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    rollNo: {
      type: String,
      trim: true,
      default: "",
    },
    isFaculty: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ["google", "linkedin", "email", ""],
      default: "",
    },
    batch: {
      type: Number,
      default: null,
    },
    department: {
      type: String,
      default: "",
      trim: true,
    },
    leavingYear: {
      type: Number,
      default: null,
    },
    lastClassAttended: {
      type: String,
      trim: true,
      default: "",
    },
    section: {
      type: String,
      trim: true,
      default: "",
    },
    currentEducation: {
      type: String,
      trim: true,
      default: "",
    },
    currentInstitution: {
      type: String,
      trim: true,
      default: "",
    },
    occupation: {
      type: String,
      trim: true,
      default: "",
    },
    company: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    industry: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    skills: [String],
    linkedinUrl: {
      type: String,
      trim: true,
    },
    websiteUrl: {
      type: String,
      trim: true,
    },
    twitterHandle: {
      type: String,
      trim: true,
    },
    profileVisibility: {
      type: String,
      enum: ["public", "institute_only", "private"],
      default: "institute_only",
    },
    showEmail: {
      type: Boolean,
      default: false,
    },
    showPhone: {
      type: Boolean,
      default: false,
    },
    allowMentorRequests: {
      type: Boolean,
      default: true,
    },
    registrationReviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    registrationRejectedReason: {
      type: String,
      trim: true,
      default: "",
    },
    registrationReviewedAt: {
      type: Date,
      default: null,
    },
    // Advanced filtering fields
    experienceYears: {
      type: Number,
      default: null,
      min: 0,
      max: 50,
    },
    companySize: {
      type: String,
      trim: true,
      default: "",
    },
    availability: {
      type: [String],
      default: [],
      enum: ["mentorship", "opportunities", "freelance", "advising", "hiring", "open", "looking"],
    },
    // Additional fields for enhanced filtering
    companyRevenue: {
      type: String,
      trim: true,
      default: "",
    },
    educationLevel: {
      type: String,
      trim: true,
      default: "",
      enum: ["high_school", "bachelors", "masters", "phd", "postdoc", "diploma", "certification", ""],
    },
  },
  {
    timestamps: true,
  },
);

alumniProfileSchema.plugin(softDeletePlugin);

export default mongoose.model("AlumniProfile", alumniProfileSchema);
