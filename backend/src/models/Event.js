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
    registrationCap: {
      type: Number,
      min: 0,
      default: null
    },
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
