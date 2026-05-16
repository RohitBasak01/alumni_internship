import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const eventSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityGroup",
      default: null,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    eventDate: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      trim: true
    },
    isVirtual: {
      type: Boolean,
      default: false
    },
    meetingLink: {
      type: String,
      trim: true
    },
    meetingPassword: {
      type: String,
      trim: true
    },
    recordingLink: {
      type: String,
      trim: true
    },
    registrationCap: {
      type: Number,
      min: 0,
      default: null
    },
    fees: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        type: { type: String },
        minQty: { type: Number },
        maxQty: { type: Number },
        validFrom: { type: Date },
        options: { type: String }
      }
    ],
    registrations: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        registeredAt: {
          type: Date,
          default: Date.now
        },
        paymentId: {
          type: String
        },
        orderId: {
          type: String
        },
        ticketCode: {
          type: String,
          unique: true,
          sparse: true
        },
        checkedInAt: {
          type: Date,
          default: null
        },
        ticketType: {
          type: String,
          default: "general"
        },
        status: {
          type: String,
          enum: ["confirmed", "waitlisted", "cancelled"],
          default: "confirmed"
        }
      }
    ],
    waitlist: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

eventSchema.plugin(softDeletePlugin);

export default mongoose.model("Event", eventSchema);
