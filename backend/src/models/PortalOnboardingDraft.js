import mongoose from "mongoose";

const portalOnboardingDraftSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft"
    },
    currentStep: {
      type: Number,
      min: 1,
      max: 4,
      default: 1
    },
    data: {
      type: Object,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("PortalOnboardingDraft", portalOnboardingDraftSchema);
