import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV !== "production";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please try again later."
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later."
  }
});
