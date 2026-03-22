import mongoose from "mongoose";

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
    primaryContactPhone: String
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Institute", instituteSchema);
