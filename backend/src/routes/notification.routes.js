import express from "express";

import { getTenantModels } from "../db/tenantConnectionManager.js";
import { protect, requireTenantAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/summary", protect, requireTenantAccess, async (req, res, next) => {
  try {
    const { AlumniProfile, MentorshipRequest } = getTenantModels(req);
    const instituteId = req.tenant._id;

    const [pendingMentorshipRequests, pendingAlumniInvites] = await Promise.all([
      req.user.role === "alumni"
        ? MentorshipRequest.countDocuments({
            instituteId,
            mentorId: req.user._id,
            status: "pending"
          })
        : Promise.resolve(0),
      req.user.role === "institute_admin"
        ? AlumniProfile.aggregate([
            {
              $match: {
                instituteId
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" },
            {
              $match: {
                "user.passwordSetupCompleted": false,
                "user.inviteTokenHash": { $ne: null }
              }
            },
            { $count: "count" }
          ]).then((result) => result[0]?.count || 0)
        : Promise.resolve(0)
    ]);

    res.json({
      pendingMentorshipRequests,
      pendingAlumniInvites
    });
  } catch (error) {
    next(error);
  }
});

export default router;
