import mongoose from "mongoose";

const emailCampaignSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    targetFilters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["draft", "sending", "completed", "failed"],
      default: "draft",
    },
    metrics: {
      sentCount: { type: Number, default: 0 },
      failedCount: { type: Number, default: 0 },
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const EmailCampaign = mongoose.model("EmailCampaign", emailCampaignSchema);
