import mongoose from "mongoose";

const communityGroupMessageSchema = new mongoose.Schema(
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

const communityGroupSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    groupType: {
      type: String,
      enum: ["interest", "class", "year", "chapter"],
      required: true,
      index: true
    },
    audienceLabel: {
      type: String,
      trim: true,
      default: ""
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    messages: {
      type: [communityGroupMessageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("CommunityGroup", communityGroupSchema);
