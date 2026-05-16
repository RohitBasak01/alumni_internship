import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const reunionSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    batch: {
      type: Number,
      required: true,
      index: true
    },
    department: {
      type: String,
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
    virtualLink: {
      type: String,
      trim: true
    },
    coverImage: {
      type: String,
      trim: true
    },
    organizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    rsvps: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        status: {
          type: String,
          enum: ["attending", "maybe", "declined"],
          default: "attending"
        },
        respondedAt: {
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

reunionSchema.plugin(softDeletePlugin);

export default mongoose.model("Reunion", reunionSchema);
