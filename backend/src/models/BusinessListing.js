import mongoose from "mongoose";

const businessListingSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250
    },
    website: {
      type: String,
      trim: true,
      default: ""
    },
    industry: {
      type: String,
      trim: true,
      default: ""
    },
    product: {
      type: String,
      trim: true,
      default: ""
    },
    service: {
      type: String,
      trim: true,
      default: ""
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true
    },
    contactCountry: {
      type: String,
      trim: true,
      default: ""
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true
    },
    isManagementTeam: {
      type: Boolean,
      required: true
    },
    logoUrl: {
      type: String,
      trim: true,
      default: ""
    },
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    timestamps: true
  }
);

businessListingSchema.index({ instituteId: 1, createdAt: -1 });

const BusinessListing = mongoose.model("BusinessListing", businessListingSchema);

export default BusinessListing;
