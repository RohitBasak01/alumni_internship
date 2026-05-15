import jwt from "jsonwebtoken";
import { getTenantModels } from "../db/tenantConnectionManager.js";
import { getJwtSecret } from "../utils/auth.js";

/**
 * Generates a signed JWT payload for the Digital ID Card.
 * The payload is designed to be encoded into a QR code.
 */
export const generateIdCardPayload = async (req, res, next) => {
  try {
    const { AlumniProfile } = getTenantModels(req);
    const userId = req.user._id;

    // Fetch alumni profile to get details like passoutYear, program
    let alumniDetails = null;
    if (req.user.role === "alumni") {
      alumniDetails = await AlumniProfile.findOne({
        userId,
        instituteId: req.tenant._id,
      });
    }

    const payload = {
      iss: "AlumniNetwork_IDSystem",
      sub: userId,
      tid: req.tenant._id, // tenant ID
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      dp: req.user.profilePicture || null,
      batch: alumniDetails?.passoutYear || null,
      program: alumniDetails?.program || null,
    };

    // Sign the token with an expiration of 24 hours to prevent screenshot abuse
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" });

    res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: "24h",
      },
    });
  } catch (error) {
    next(error);
  }
};
