import mongoose from "mongoose";

const oauthAccountSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["google", "linkedin"],
      required: true
    },
    providerUserId: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    linkedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

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
    },
    oauthAccounts: {
      type: [oauthAccountSchema],
      default: []
    },
    e2eePublicKey: {
      type: String,
      trim: true,
      default: ""
    },
    e2eeKeyAlgorithm: {
      type: String,
      trim: true,
      default: ""
    },
    e2eeKeyUpdatedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("User", userSchema);
