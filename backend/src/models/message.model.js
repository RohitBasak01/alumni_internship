import mongoose from "mongoose";
import { softDeletePlugin } from "../utils/softDeletePlugin.js";

const messageAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
    isEncrypted: { type: Boolean, default: false },
    encryptionVersion: { type: String, trim: true, default: "" },
    encryptionAlgorithm: { type: String, trim: true, default: "" },
    encryptionIv: { type: String, trim: true, default: "" },
    originalMimeType: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const messageReactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, trim: true, required: true }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorshipRequest",
      required: true,
      index: true
    },
    clientId: { type: String, trim: true, default: null },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, default: "", trim: true },
    replyToMessageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    attachments: { type: [messageAttachmentSchema], default: [] },
    reactions: { type: [messageReactionSchema], default: [] },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    deletedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

messageSchema.index({ instituteId: 1, conversationId: 1, createdAt: -1 });

messageSchema.plugin(softDeletePlugin);

const Message = mongoose.model("Message", messageSchema);
export default Message;
