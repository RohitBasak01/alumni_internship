import mongoose from "mongoose";

const alumniProfileSchema = new mongoose.Schema(
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
      required: true
    },
    batch: {
      type: Number,
      required: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    skills: [String],
    linkedinUrl: {
      type: String,
      trim: true
    },
    websiteUrl: {
      type: String,
      trim: true
    },
    twitterHandle: {
      type: String,
      trim: true
    },
    registrationReviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("AlumniProfile", alumniProfileSchema);
