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
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
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
