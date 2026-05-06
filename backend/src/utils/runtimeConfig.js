export function parseAllowedOrigins() {
  const configured = String(
    process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || process.env.FRONTEND_URL || ""
  );

  return configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getStorageMode() {
  if (process.env.CLOUDINARY_URL || process.env.S3_BUCKET || process.env.STORAGE_PROVIDER) {
    return process.env.STORAGE_PROVIDER || (process.env.CLOUDINARY_URL ? "cloudinary" : "s3-compatible");
  }

  return "local";
}

export function hasSmtpRuntimeConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
