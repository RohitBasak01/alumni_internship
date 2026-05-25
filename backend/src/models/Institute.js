import mongoose from "mongoose";
import { getDefaultProfileFields } from "../utils/tenantConfig.js";

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
    enableConnections: {
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
    },
    heroImageUrl: {
      type: String,
      trim: true
    }
  },
  {
    _id: false
  }
);

const profileFieldSchema = new mongoose.Schema(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["text", "textarea", "select", "date", "number"], default: "text" },
    options: { type: [String], default: [] },
    visibility: { type: String, enum: ["required", "optional", "hidden"], default: "required" },
    showInRegistration: { type: String, enum: ["required", "optional", "hidden"], default: "optional" },
    showInProfile: { type: Boolean, default: true },
    isStandard: { type: Boolean, default: false }
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
        enableConnections: true,
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
    profileFields: {
      type: [profileFieldSchema],
      default: () => getDefaultProfileFields("college")
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
    billingProvider: {
      type: String,
      enum: ["manual", "stripe"],
      default: "manual"
    },
    stripeCustomerId: {
      type: String,
      trim: true,
      default: ""
    },
    stripeSubscriptionId: {
      type: String,
      trim: true,
      default: ""
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
        },
        provider: {
          type: String,
          default: "manual"
        },
        externalId: {
          type: String,
          default: ""
        }
      }
    ],
    primaryContactName: String,
    primaryContactEmail: String,
    primaryContactPhone: String,
    leadershipMessages: {
      type: [
        new mongoose.Schema(
          {
            role: { type: String, trim: true, required: true },
            name: { type: String, trim: true, required: true },
            title: { type: String, trim: true, default: "" },
            photoUrl: { type: String, trim: true, default: "" },
            message: { type: String, trim: true, default: "" },
            salutation: { type: String, trim: true, default: "" }
          },
          { _id: true }
        )
      ],
      default: []
    },
    quickLinks: {
      type: [
        new mongoose.Schema(
          {
            label: { type: String, trim: true, required: true },
            icon: { type: String, trim: true, default: "link" },
            url: { type: String, trim: true, default: "" },
            enabled: { type: Boolean, default: true }
          },
          { _id: true }
        )
      ],
      default: []
    },
    socialLinks: {
      type: new mongoose.Schema(
        {
          facebook: { type: String, trim: true, default: "" },
          twitter: { type: String, trim: true, default: "" },
          linkedin: { type: String, trim: true, default: "" },
          youtube: { type: String, trim: true, default: "" },
          instagram: { type: String, trim: true, default: "" }
        },
        { _id: false }
      ),
      default: () => ({})
    },
    departments: {
      type: [String],
      default: []
    },
    departmentStreams: {
      type: Object,
      default: {}
    },
    streams: {
      type: [String],
      default: []
    },
    manualUpdates: {
      type: [
        new mongoose.Schema(
          {
            text: { type: String, required: true },
            date: { type: Date, default: Date.now },
            category: { type: String, default: "General" }
          },
          { _id: true }
        )
      ],
      default: []
    },
    integrations: {
      type: new mongoose.Schema({
        ssoEnabled: { type: Boolean, default: false },
        ssoProvider: { type: String, default: "google" },
        googleAnalyticsId: { type: String, default: "" },
        stripePublicKey: { type: String, default: "" }
      }, { _id: false }),
      default: () => ({
        ssoEnabled: false,
        ssoProvider: "google",
        googleAnalyticsId: "",
        stripePublicKey: ""
      })
    },
    emailTemplates: {
      type: new mongoose.Schema({
        welcomeSubject: { type: String, default: "Welcome to {{institute}} Alumni Portal!" },
        welcomeBody: { type: String, default: "Hello {{name}},\n\nWelcome to the official alumni community of {{institute}}!" },
        approvalSubject: { type: String, default: "Your alumni account has been approved!" },
        approvalBody: { type: String, default: "Hello {{name}},\n\nYour registration has been approved. You can now log in." }
      }, { _id: false }),
      default: () => ({
        welcomeSubject: "Welcome to {{institute}} Alumni Portal!",
        welcomeBody: "Hello {{name}},\n\nWelcome to the official alumni community of {{institute}}!",
        approvalSubject: "Your alumni account has been approved!",
        approvalBody: "Hello {{name}},\n\nYour registration has been approved. You can now log in."
      })
    },
    security: {
      type: new mongoose.Schema({
        sessionTimeout: { type: Number, default: 60 },
        passwordMinLength: { type: Number, default: 8 },
        require2FA: { type: Boolean, default: false }
      }, { _id: false }),
      default: () => ({
        sessionTimeout: 60,
        passwordMinLength: 8,
        require2FA: false
      })
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Institute", instituteSchema);
