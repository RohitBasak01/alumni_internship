import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const forumReplySchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumThread",
      required: true,
      index: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    parentReplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumReply",
      default: null
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    isAccepted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

forumReplySchema.plugin(softDeletePlugin);

export default mongoose.model("ForumReply", forumReplySchema);
