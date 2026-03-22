import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorRole: {
      type: String,
      default: "system"
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    targetType: {
      type: String,
      required: true,
      trim: true
    },
    targetId: {
      type: String,
      required: true,
      trim: true
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      default: null,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("AuditLog", auditLogSchema);
