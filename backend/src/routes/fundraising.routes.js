import express from "express";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { authorizeWithDelegation } from "../middleware/delegation.middleware.js";
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  initiateDonation,
  verifyDonation,
} from "../controllers/fundraising.controller.js";

const router = express.Router();

router.use(protect);
router.use(requireTenantAccess);

// Public (Alumni & Admin)
router.get("/campaigns", getCampaigns);
router.get("/campaigns/:id", getCampaign);

// Donations
router.post("/campaigns/:id/donate", initiateDonation);
router.post("/campaigns/:id/verify", verifyDonation);

// Admin Only
router.use(authorizeWithDelegation("manage_fundraising"));
router.post("/campaigns", createCampaign);
router.patch("/campaigns/:id", updateCampaign);

export default router;
