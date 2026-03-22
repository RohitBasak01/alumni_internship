import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    coverLetter: {
      type: String,
      trim: true
    },
    resumeUrl: {
      type: String,
      trim: true
    },
    resumeFileName: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "rejected"],
      default: "pending"
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate applications from the same user for the same job
jobApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export default mongoose.model("JobApplication", jobApplicationSchema);
