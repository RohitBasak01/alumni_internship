import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { validateBody, validateParams } from "../middleware/validate.middleware.js";
import { isEmail, isNonEmptyString, isObjectIdLike } from "../utils/validation.js";

const router = express.Router();

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidLogoValue(value) {
  if (!isNonEmptyString(value)) {
    return true;
  }

  const trimmed = value.trim();

  if (isValidHttpUrl(trimmed)) {
    return true;
  }

  return /^data:image\/(png|jpe?g);base64,/i.test(trimmed);
}

function validateCreateBusinessListingBody(body) {
  const issues = [];

  if (!isNonEmptyString(body.businessName)) {
    issues.push("Business name is required");
  }

  if (!isNonEmptyString(body.description)) {
    issues.push("Description is required");
  } else if (String(body.description).trim().length > 250) {
    issues.push("Description must be at most 250 characters");
  }

  if (body.website && !isValidHttpUrl(body.website)) {
    issues.push("Website must be a valid http(s) URL");
  }

  if (!isNonEmptyString(body.contactEmail) || !isEmail(body.contactEmail)) {
    issues.push("A valid contact email is required");
  }

  if (!isNonEmptyString(body.contactNumber)) {
    issues.push("Contact number is required");
  }

  if (typeof body.isManagementTeam !== "boolean") {
    issues.push("Management team selection is required");
  }

  if (body.termsAccepted !== true) {
    issues.push("You must accept terms and conditions");
  }

  if (!isValidLogoValue(body.logoUrl)) {
    issues.push("Logo must be a valid image URL or PNG/JPG data image");
  }

  return issues;
}

function validateBusinessListingParams(params) {
  return isObjectIdLike(params.id) ? [] : ["Invalid business listing id"];
}

function formatListing(item) {
  return {
    _id: item._id,
    businessName: item.businessName,
    description: item.description,
    website: item.website,
    industry: item.industry,
    product: item.product,
    service: item.service,
    location: item.location,
    contactEmail: item.contactEmail,
    contactCountry: item.contactCountry,
    contactNumber: item.contactNumber,
    isManagementTeam: item.isManagementTeam,
    logoUrl: item.logoUrl,
    termsAccepted: item.termsAccepted,
    owner: {
      id: item.userId?._id || null,
      name: item.userId?.name || "Unknown User",
      role: item.userId?.role || "unknown"
    },
    createdAt: item.createdAt
  };
}

router.get("/", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { BusinessListing } = getTenantModels(req);
    const items = await BusinessListing.find({ instituteId: req.tenant._id })
      .populate("userId", "name role")
      .sort({ createdAt: -1 });

    res.json(items.map(formatListing));
  } catch (error) {
    next(error);
  }
});

router.post("/", protect, requireTenantAccess, validateBody(validateCreateBusinessListingBody), async (req, res, next) => {
  try {
    const { BusinessListing } = getTenantModels(req);

    const created = await BusinessListing.create({
      instituteId: req.tenant._id,
      userId: req.user._id,
      businessName: req.body.businessName.trim(),
      description: req.body.description.trim(),
      website: req.body.website?.trim?.() || "",
      industry: req.body.industry?.trim?.() || "",
      product: req.body.product?.trim?.() || "",
      service: req.body.service?.trim?.() || "",
      location: req.body.location?.trim?.() || "",
      contactEmail: req.body.contactEmail.trim(),
      contactCountry: req.body.contactCountry?.trim?.() || "",
      contactNumber: req.body.contactNumber.trim(),
      isManagementTeam: Boolean(req.body.isManagementTeam),
      logoUrl: req.body.logoUrl?.trim?.() || "",
      termsAccepted: true
    });

    await created.populate("userId", "name role");
    res.status(201).json(formatListing(created));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", protect, requireTenantAccess, validateParams(validateBusinessListingParams), async (req, res, next) => {
  try {
    const { BusinessListing } = getTenantModels(req);

    const item = await BusinessListing.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id
    });

    if (!item) {
      const error = new Error("Business listing not found");
      error.statusCode = 404;
      throw error;
    }

    const isAdmin = req.user.role === "institute_admin";
    const isOwner = item.userId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      const error = new Error("You do not have permission to remove this listing");
      error.statusCode = 403;
      throw error;
    }

    await item.deleteOne();
    res.json({ message: "Business listing removed" });
  } catch (error) {
    next(error);
  }
});

export default router;
