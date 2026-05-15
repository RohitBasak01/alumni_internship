import mongoose from "mongoose";

/**
 * Tracks every delegation event for audit and history display.
 * One document per grant or revoke action (not per active delegation).
 */
const roleDelegationSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true,
    },
    grantedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetName: {
      // denormalised for display in history even after user changes
      type: String,
      trim: true,
      default: "",
    },
    targetEmail: {
      type: String,
      trim: true,
      default: "",
    },
    action: {
      type: String,
      enum: ["granted", "revoked", "auto_expired"],
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RoleDelegation", roleDelegationSchema);
