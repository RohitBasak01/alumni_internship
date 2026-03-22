import crypto from "node:crypto";

export function attachRequestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();

  req.requestId = requestId;
  req.requestStartedAt = Date.now();
  res.setHeader("x-request-id", requestId);

  next();
}

export function structuredRequestLogger(req, res, next) {
  res.on("finish", () => {
    const durationMs = Date.now() - (req.requestStartedAt || Date.now());
    const logEntry = {
      level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      actorId: req.user?._id?.toString?.() || null,
      actorRole: req.user?.role || null,
      tenantId: req.tenant?._id?.toString?.() || null,
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
}
