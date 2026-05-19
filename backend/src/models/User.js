import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

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
    resetPasswordTokenHash: {
      type: String,
      default: null
    },
    resetPasswordExpiresAt: {
      type: Date,
      default: null
    },
    oauthAccounts: {
      type: [oauthAccountSchema],
      default: []
    },
    notificationPreferences: {
      emailDigest: {
        type: String,
        enum: ["realtime", "daily", "weekly", "off"],
        default: "daily"
      },
      categories: {
        connections: {
          type: Boolean,
          default: true
        },
        jobs: {
          type: Boolean,
          default: true
        },
        events: {
          type: Boolean,
          default: true
        },
        system: {
          type: Boolean,
          default: true
        }
      }
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
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
    },
    blockedUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    mutedConversationIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "MentorshipRequest",
      default: []
    },
    // Role delegation fields
    isDelegatedAdmin: {
      type: Boolean,
      default: false
    },
    delegatedAdminSince: {
      type: Date,
      default: null
    },
    delegatedAdminExpiresAt: {
      type: Date,
      default: null
    },
    delegatedPermissions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

userSchema.plugin(softDeletePlugin);

export default mongoose.model("User", userSchema);
