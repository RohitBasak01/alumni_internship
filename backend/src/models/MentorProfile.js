import mongoose from "mongoose";

const mentorProfileSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expertise: {
      type: [String],
      required: true,
    },
    bio: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    availabilityText: {
      type: String,
      required: true,
      maxlength: 300,
    },
    maxSessionsPerMonth: {
      type: Number,
      default: 4,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const MentorProfile = mongoose.model("MentorProfile", mentorProfileSchema);

export default MentorProfile;
