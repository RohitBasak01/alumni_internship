import express from "express";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import { generateIdCardPayload } from "../controllers/idcard.controller.js";

const router = express.Router();

router.use(protect);
router.use(requireTenantAccess);

// Generate ID Card Token
router.get("/payload", generateIdCardPayload);

export default router;
