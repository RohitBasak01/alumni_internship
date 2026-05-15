import mongoose from "mongoose";

const mentorshipSessionSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    menteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "declined"],
      default: "pending",
    },
    proposedTimes: {
      type: [String], // Array of proposed date/time strings
      required: true,
    },
    confirmedTime: {
      type: String,
    },
    meetingLink: {
      type: String,
    },
    agenda: {
      type: String,
      required: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

const MentorshipSession = mongoose.model("MentorshipSession", mentorshipSessionSchema);

export default MentorshipSession;
