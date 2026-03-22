import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["super_admin", "institute_admin", "alumni"],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    inviteTokenHash: {
      type: String,
      default: null
    },
    inviteTokenExpiresAt: {
      type: Date,
      default: null
    },
    passwordSetupCompleted: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);
