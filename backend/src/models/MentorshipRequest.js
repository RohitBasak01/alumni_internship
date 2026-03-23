import mongoose from "mongoose";

const mentorshipMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: true
  }
);

const mentorshipRequestSchema = new mongoose.Schema(
  {
    conversationType: {
      type: String,
      enum: ["direct", "group"],
      default: "direct"
    },
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    groupName: {
      type: String,
      trim: true
    },
    memberIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      default: []
    },
    adminIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      default: []
    },
    message: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "active"],
      default: "pending"
    },
    messages: {
      type: [mentorshipMessageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("MentorshipRequest", mentorshipRequestSchema);
