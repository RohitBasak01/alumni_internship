import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
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
    company: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      trim: true
    },
    requestedDeadline: {
      type: Date,
      default: null
    },
    applicationDeadline: {
      type: Date,
      default: null,
      index: true
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["pending_approval", "published", "rejected", "expired"],
      default: "pending_approval"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Job", jobSchema);
