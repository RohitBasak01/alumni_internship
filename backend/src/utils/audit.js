import AuditLog from "../models/AuditLog.js";

export async function logAuditEvent(req, payload) {
  try {
    await AuditLog.create({
      actorId: req.user?._id || null,
      actorRole: req.user?.role || "system",
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
      ...payload
    });
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
