import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, authorize, requireTenantAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

// Alumni: get their own resume
router.get(
  "/my",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Resume } = getTenantModels(req);
      let resume = await Resume.findOne({
        userId: req.user._id,
        instituteId: req.tenant._id
      });

      if (!resume) {
        // Return a default empty resume if none exists
        return res.json({
          personalInfo: { fullName: req.user.name || "", email: req.user.email || "", phone: "", location: "", linkedin: "", website: "" },
          summary: "",
          experience: [],
          education: [],
          skills: [],
          projects: [],
          theme: "modern"
        });
      }

      res.json(resume);
    } catch (error) {
      next(error);
    }
  }
);

// Alumni: save/update their resume
router.put(
  "/my",
  protect,
  authorize("alumni"),
  requireTenantAccess,
  async (req, res, next) => {
    try {
      const { Resume } = getTenantModels(req);
      
      const payload = {
        personalInfo: req.body.personalInfo || {},
        summary: req.body.summary || "",
        experience: req.body.experience || [],
        education: req.body.education || [],
        skills: req.body.skills || [],
        projects: req.body.projects || [],
        theme: req.body.theme || "modern"
      };

      const resume = await Resume.findOneAndUpdate(
        {
          userId: req.user._id,
          instituteId: req.tenant._id
        },
        payload,
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      );

      res.json(resume);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
