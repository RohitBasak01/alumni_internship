import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const forumThreadSchema = new mongoose.Schema(
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
    body: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["general", "career", "technical", "campus", "other"],
      default: "general"
    },
    tags: {
      type: [String],
      default: []
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    isPinned: {
      type: Boolean,
      default: false
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    viewCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

forumThreadSchema.index({ instituteId: 1, category: 1 });
forumThreadSchema.index({ instituteId: 1, createdAt: -1 });

forumThreadSchema.plugin(softDeletePlugin);

export default mongoose.model("ForumThread", forumThreadSchema);
