import express from "express";
import { protect, requireTenantAccess, authorize } from "../middleware/auth.middleware.js";
import { getAdminAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.use(protect);
router.use(requireTenantAccess);

// Admin Analytics - Restricted to Admins
router.get("/admin", authorize("institute_admin"), getAdminAnalytics);

export default router;
