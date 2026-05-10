import mongoose from "mongoose";

const galleryItemSchema = new mongoose.Schema(
  {
    instituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    section: {
      type: String,
      enum: ["images", "videos", "personal_photos"],
      required: true,
      index: true
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 240,
      default: ""
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    comments: {
      type: [
        new mongoose.Schema(
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true
            },
            content: {
              type: String,
              required: true,
              trim: true,
              maxlength: 500
            }
          },
          { timestamps: true }
        )
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

galleryItemSchema.index({ instituteId: 1, section: 1, createdAt: -1 });

const GalleryItem = mongoose.model("GalleryItem", galleryItemSchema);

export default GalleryItem;
