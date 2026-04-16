import mongoose from "mongoose";

const mentorshipMessageAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    url: {
      type: String,
      trim: true,
      required: true
    },
    mimeType: {
      type: String,
      trim: true,
      default: ""
    },
    size: {
      type: Number,
      default: 0
    },
    isEncrypted: {
      type: Boolean,
      default: false
    },
    encryptionVersion: {
      type: String,
      trim: true,
      default: ""
    },
    encryptionAlgorithm: {
      type: String,
      trim: true,
      default: ""
    },
    encryptionIv: {
      type: String,
      trim: true,
      default: ""
    },
    originalMimeType: {
      type: String,
      trim: true,
      default: ""
    },
    originalName: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    _id: false
  }
);

const mentorshipMessageReactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    emoji: {
      type: String,
      trim: true,
      required: true
    }
  },
  {
    _id: false
  }
);

const mentorshipMessageSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      trim: true,
      default: null
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      default: "",
      trim: true
    },
    replyToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    attachments: {
      type: [mentorshipMessageAttachmentSchema],
      default: []
    },
    reactions: {
      type: [mentorshipMessageReactionSchema],
      default: []
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    editedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    deliveredTo: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      default: []
    },
    readBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      default: []
    }
  },
  {
    _id: true
  }
);

const mentorshipTypingMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const mentorshipGroupRoleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["member", "moderator", "admin"],
      default: "member"
    }
  },
  {
    _id: false
  }
);

const mentorshipMutedMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    mutedUntil: {
      type: Date,
      required: true
    },
    mutedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    _id: false
  }
);

const mentorshipConversationKeyEnvelopeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    encryptedKey: {
      type: String,
      trim: true,
      required: true
    },
    algorithm: {
      type: String,
      trim: true,
      default: "RSA-OAEP"
    },
    version: {
      type: String,
      trim: true,
      default: "conv-v1"
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
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
    memberRoles: {
      type: [mentorshipGroupRoleSchema],
      default: []
    },
    mutedMembers: {
      type: [mentorshipMutedMemberSchema],
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
    },
    typingMembers: {
      type: [mentorshipTypingMemberSchema],
      default: []
    },
    conversationKeyEnvelopes: {
      type: [mentorshipConversationKeyEnvelopeSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("MentorshipRequest", mentorshipRequestSchema);
