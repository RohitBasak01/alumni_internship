import mongoose from "mongoose";

const communityLabelsSchema = new mongoose.Schema(
  {
    memberPlural: {
      type: String,
      trim: true
    },
    memberSingular: {
      type: String,
      trim: true
    },
    adminLabel: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);

const featureFlagsSchema = new mongoose.Schema(
  {
    enableJobs: {
      type: Boolean,
      default: true
    },
    enableMentorship: {
      type: Boolean,
      default: true
    },
    enableDirectory: {
      type: Boolean,
      default: true
    },
    enableEvents: {
      type: Boolean,
      default: true
    },
    enableAnnouncements: {
      type: Boolean,
      default: true
    },
    enableGroups: {
      type: Boolean,
      default: true
    },
    enableSocialLinks: {
      type: Boolean,
      default: true
    },
    enableCareerFields: {
      type: Boolean,
      default: true
    },
    allowStudentRegistrations: {
      type: Boolean,
      default: false
    },
    autoApproveAlumni: {
      type: Boolean,
      default: false
    },
    autoApproveEmailDomains: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const brandingSchema = new mongoose.Schema(
  {
    tagline: {
      type: String,
      trim: true
    },
    primaryColor: {
      type: String,
      trim: true
    },
    secondaryColor: {
      type: String,
      trim: true
    },
    accentColor: {
      type: String,
      trim: true
    },
    logoUrl: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);

const instituteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    domain: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    subdomain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    institutionType: {
      type: String,
      enum: ["college", "school"],
      default: "college"
    },
    educationLevel: {
      type: String,
      enum: ["k10", "k12", "higher_ed"],
      default: "higher_ed"
    },
    communityLabels: {
      type: communityLabelsSchema,
      default: () => ({
        memberPlural: "Alumni",
        memberSingular: "Alumnus/Alumna",
        adminLabel: "Institute Admin"
      })
    },
    featureFlags: {
      type: featureFlagsSchema,
      default: () => ({
        enableJobs: true,
        enableMentorship: true,
        enableDirectory: true,
        enableEvents: true,
        enableAnnouncements: true,
        enableGroups: true,
        enableSocialLinks: true,
        enableCareerFields: true
      })
    },
    branding: {
      type: brandingSchema,
      default: () => ({
        tagline: "Build lifelong alumni relationships.",
        primaryColor: "#2554d8",
        secondaryColor: "#163795",
        accentColor: "#eef3ff",
        logoUrl: ""
      })
    },
    website: {
      type: String,
      trim: true,
      default: ""
    },
    bio: {
      type: String,
      trim: true,
      default: ""
    },
    dataIsolationMode: {
      type: String,
      enum: ["shared", "dedicated"],
      default: "shared"
    },
    tenantDatabaseName: {
      type: String,
      trim: true
    },
    tenantDatabaseUri: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending"
    },
    subscriptionPlan: {
      type: String,
      enum: ["basic", "pro", "enterprise"],
      default: "basic"
    },
    subscriptionStatus: {
      type: String,
      enum: ["inactive", "trial", "active", "expired"],
      default: "inactive"
    },
    subscriptionRenewsAt: {
      type: Date,
      default: null
    },
    lastPaymentAt: {
      type: Date,
      default: null
    },
    billingHistory: [
      {
        plan: {
          type: String,
          default: "basic"
        },
        status: {
          type: String,
          default: "active"
        },
        amount: {
          type: Number,
          default: 0
        },
        currency: {
          type: String,
          default: "INR"
        },
        paidAt: {
          type: Date,
          default: Date.now
        },
        notes: {
          type: String,
          default: ""
        }
      }
    ],
    primaryContactName: String,
    primaryContactEmail: String,
    primaryContactPhone: String,
    departments: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Institute", instituteSchema);
