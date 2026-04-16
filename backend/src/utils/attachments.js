import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MIME_EXTENSION_MAP = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }

  const mimeType = match[1] || "application/octet-stream";
  const base64Payload = match[2] || "";

  try {
    const buffer = Buffer.from(base64Payload, "base64");
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

function toSafeFileName(name) {
  const normalized = String(name || "attachment")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return normalized || "attachment";
}

function getFileExtension(name, mimeType) {
  const trimmedName = String(name || "").trim();
  const explicitExtension = trimmedName.includes(".") ? trimmedName.split(".").pop().toLowerCase() : "";
  if (explicitExtension && explicitExtension.length <= 10) {
    return explicitExtension;
  }

  if (MIME_EXTENSION_MAP[mimeType]) {
    return MIME_EXTENSION_MAP[mimeType];
  }

  if (mimeType.includes("/")) {
    const candidate = mimeType.split("/").pop().toLowerCase();
    if (candidate) {
      return candidate.slice(0, 10);
    }
  }

  return "bin";
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function isUploadPath(value) {
  return String(value || "").startsWith("/uploads/");
}

function buildStoredFileName(name, mimeType) {
  const extension = getFileExtension(name, mimeType);
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const safeBaseName = toSafeFileName(name).replace(/\.[^.]+$/, "");
  return `${Date.now()}-${randomSuffix}-${safeBaseName}.${extension}`;
}

export async function storeIncomingUpload({ buffer, originalName, mimeType, size, tenantId, userId }) {
  const safeTenantId = String(tenantId || "shared");
  const safeUserId = String(userId || "anonymous");
  const safeName = String(originalName || "attachment").trim() || "attachment";
  const uploadDirectory = path.join(
    process.cwd(),
    "uploads",
    "mentorship",
    "temp",
    safeTenantId,
    safeUserId
  );

  await fs.mkdir(uploadDirectory, { recursive: true });

  const storedFileName = buildStoredFileName(safeName, mimeType || "application/octet-stream");
  const absolutePath = path.join(uploadDirectory, storedFileName);
  await fs.writeFile(absolutePath, buffer);

  return {
    name: safeName,
    url: `/uploads/mentorship/temp/${safeTenantId}/${safeUserId}/${storedFileName}`,
    mimeType: mimeType || "application/octet-stream",
    size: Number.isFinite(Number(size)) ? Number(size) : buffer.length
  };
}

export async function persistMentorshipAttachments(attachments, { tenantId, conversationId }) {
  const safeTenantId = String(tenantId || "shared");
  const safeConversationId = String(conversationId || "general");
  const attachmentList = Array.isArray(attachments) ? attachments : [];

  const uploadDirectory = path.join(
    process.cwd(),
    "uploads",
    "mentorship",
    safeTenantId,
    safeConversationId
  );

  await fs.mkdir(uploadDirectory, { recursive: true });

  const persisted = [];

  for (const attachment of attachmentList) {
    const name = String(attachment?.name || "attachment").trim() || "attachment";
    const url = String(attachment?.url || "").trim();
    const mimeType = String(attachment?.mimeType || "application/octet-stream").trim() || "application/octet-stream";
    const declaredSize = Number(attachment?.size || 0);

    if (!url) {
      continue;
    }

    if (isExternalUrl(url) || isUploadPath(url)) {
      persisted.push({
        name,
        url,
        mimeType,
        size: Number.isFinite(declaredSize) && declaredSize >= 0 ? declaredSize : 0
      });
      continue;
    }

    const parsedDataUrl = parseDataUrl(url);
    if (!parsedDataUrl) {
      continue;
    }

    const storedFileName = buildStoredFileName(name, parsedDataUrl.mimeType || mimeType);
    const absolutePath = path.join(uploadDirectory, storedFileName);

    await fs.writeFile(absolutePath, parsedDataUrl.buffer);

    const publicPath = `/uploads/mentorship/${safeTenantId}/${safeConversationId}/${storedFileName}`;

    persisted.push({
      name,
      url: publicPath,
      mimeType: parsedDataUrl.mimeType || mimeType,
      size: parsedDataUrl.buffer.length
    });
  }

  return persisted;
}
