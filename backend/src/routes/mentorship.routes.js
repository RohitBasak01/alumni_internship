import express from "express";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";
import {
  optInAsMentor,
  getMentors,
  getMyMentorProfile,
  toggleMentorStatus,
  getMySessions,
  requestSession,
  respondToSession,
  cancelSession
} from "../controllers/mentorship.controller.js";

const router = express.Router();

router.use(protect);
router.use(requireTenantAccess);

// Mentor Profiles
router.post("/profile", optInAsMentor);
router.get("/profile/me", getMyMentorProfile);
router.patch("/profile/toggle", toggleMentorStatus);
router.get("/mentors", getMentors);

// Mentorship Sessions
router.get("/sessions", getMySessions);
router.post("/sessions/request", requestSession);
router.patch("/sessions/:id/respond", respondToSession);
router.patch("/sessions/:id/cancel", cancelSession);

export default router;
