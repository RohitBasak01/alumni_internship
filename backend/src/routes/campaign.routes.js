import express from "express";
import { EmailCampaign } from "../models/EmailCampaign.js";
import AlumniProfile from "../models/AlumniProfile.js";
import { sendCampaignEmail } from "../utils/email.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply auth and admin check to all campaign routes
router.use(protect);
router.use(authorize("institute_admin"));

/**
 * GET /api/admin/campaigns
 * List all campaigns for the current tenant.
 */
router.get("/", async (req, res, next) => {
  try {
    const campaigns = await EmailCampaign.find({ instituteId: req.tenant._id })
      .sort({ createdAt: -1 })
      .populate("authorId", "name email");
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/campaigns/:id
 * Get a specific campaign.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id,
    }).populate("authorId", "name email");

    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/campaigns
 * Create a new draft campaign.
 */
router.post("/", async (req, res, next) => {
  try {
    const { subject, content, targetFilters } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ message: "Subject and content are required." });
    }

    const campaign = new EmailCampaign({
      instituteId: req.tenant._id,
      authorId: req.user._id,
      subject,
      content,
      targetFilters: targetFilters || {},
      status: "draft",
    });

    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/campaigns/:id
 * Update an existing draft campaign.
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { subject, content, targetFilters } = req.body;

    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id,
    });

    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (campaign.status !== "draft") {
      return res.status(400).json({ message: "Only draft campaigns can be edited." });
    }

    if (subject !== undefined) campaign.subject = subject;
    if (content !== undefined) campaign.content = content;
    if (targetFilters !== undefined) campaign.targetFilters = targetFilters;

    await campaign.save();
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/campaigns/:id/send
 * Initiate sending the email campaign asynchronously.
 */
router.post("/:id/send", async (req, res, next) => {
  try {
    const campaign = await EmailCampaign.findOne({
      _id: req.params.id,
      instituteId: req.tenant._id,
    });

    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    if (campaign.status !== "draft" && campaign.status !== "failed") {
      return res.status(400).json({ message: "Campaign is already being sent or completed." });
    }

    // Build the query to find target alumni
    const query = { instituteId: req.tenant._id };
    
    // Convert targetFilters to mongoose query
    const filters = campaign.targetFilters || {};
    if (filters.batch) query.batch = filters.batch;
    if (filters.department) query.department = filters.department;
    if (filters.industry) query.industry = filters.industry;
    if (filters.isFaculty) query.isFaculty = filters.isFaculty;
    
    // Get all matching alumni who have an email (by populating userId)
    const targets = await AlumniProfile.find(query).populate("userId", "email isActive");
    
    // Filter out targets without a valid active email
    const validRecipients = targets.filter(t => t.userId && t.userId.email && t.userId.isActive !== false);

    if (validRecipients.length === 0) {
      return res.status(400).json({ message: "No valid recipients found for these filters." });
    }

    // Mark campaign as sending
    campaign.status = "sending";
    campaign.sentAt = new Date();
    await campaign.save();

    // Return immediate success
    res.json({ message: "Campaign dispatch started.", expectedCount: validRecipients.length });

    // --- Fire and forget async processing ---
    (async () => {
      let sent = 0;
      let failed = 0;

      for (const recipient of validRecipients) {
        try {
          await sendCampaignEmail({
            to: recipient.userId.email,
            recipientName: recipient.name,
            subject: campaign.subject,
            htmlContent: campaign.content,
            instituteName: req.tenant.displayName,
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send campaign email to ${recipient.userId.email}:`, err);
          failed++;
        }

        // Small delay to prevent SMTP rate limits / blocking event loop
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Finalize campaign
      campaign.status = failed > 0 && sent === 0 ? "failed" : "completed";
      campaign.metrics = { sentCount: sent, failedCount: failed };
      await campaign.save();
    })().catch(err => {
      console.error(`Fatal error in campaign ${campaign._id} async sending:`, err);
      campaign.status = "failed";
      campaign.save().catch(console.error);
    });

  } catch (error) {
    next(error);
  }
});

export default router;
