import crypto from "node:crypto";

export function csrfProtection(req, res, next) {
  // 1. Skip GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Generate a CSRF token and set it in a cookie if it doesn't exist
    if (!req.cookies.csrfToken) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie("csrfToken", token, {
        httpOnly: false, // Must be accessible by frontend JS
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }
    return next();
  }

  // 2. Validate token for mutations
  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ 
      message: "CSRF token mismatch or missing. Please refresh the page.",
      code: "CSRF_ERROR"
    });
  }

  next();
}
