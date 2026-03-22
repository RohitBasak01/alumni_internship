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
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "published"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Job", jobSchema);
