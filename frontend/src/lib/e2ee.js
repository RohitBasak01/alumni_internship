const ENVELOPE_PREFIX = "enc:v1:";
const MANAGED_SECRET_PREFIX = "k1:";
const FILE_ENCRYPTION_VERSION = "file-v1";
const FILE_ENCRYPTION_ALGORITHM = "AES-GCM";
const DEVICE_PUBLIC_KEY_STORAGE = "friendship:e2ee:device-public-jwk";
const DEVICE_PRIVATE_KEY_STORAGE = "friendship:e2ee:device-private-jwk";

function toBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveConversationKey(secret, conversationId) {
  const keyBytes = await deriveConversationSecretKeyBytes(secret, conversationId);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function deriveLegacyConversationSecretKeyBytes(secret, conversationId) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(secret || "")),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(`alumni-chat:${conversationId}`),
      iterations: 120000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return new Uint8Array(derivedBits);
}

function decodeManagedConversationSecret(secret) {
  const value = String(secret || "").trim();
  if (!value.startsWith(MANAGED_SECRET_PREFIX)) {
    return null;
  }

  const encodedBytes = value.slice(MANAGED_SECRET_PREFIX.length);
  if (!encodedBytes) {
    return null;
  }

  try {
    return fromBase64(encodedBytes);
  } catch {
    return null;
  }
}

function ensureManagedConversationSecret(value) {
  const decoded = decodeManagedConversationSecret(value);
  if (!decoded) {
    return "";
  }

  return `${MANAGED_SECRET_PREFIX}${toBase64(decoded)}`;
}

async function deriveConversationSecretKeyBytes(secret, conversationId) {
  const managedSecretBytes = decodeManagedConversationSecret(secret);
  if (managedSecretBytes) {
    return managedSecretBytes;
  }

  return deriveLegacyConversationSecretKeyBytes(secret, conversationId);
}

function toHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getConversationKeyFingerprint(secret, conversationId) {
  const encoder = new TextEncoder();
  const keyBytes = await deriveConversationSecretKeyBytes(secret, conversationId);
  const conversationBytes = encoder.encode(String(conversationId || ""));
  const digestInput = new Uint8Array(keyBytes.length + conversationBytes.length);
  digestInput.set(keyBytes, 0);
  digestInput.set(conversationBytes, keyBytes.length);

  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  const fingerprint = toHex(new Uint8Array(digest)).slice(0, 24);
  return fingerprint.match(/.{1,4}/g)?.join("-") || fingerprint;
}

export function generateConversationSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `${MANAGED_SECRET_PREFIX}${toBase64(bytes)}`;
}

function parseStoredJwk(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function getLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Local storage is unavailable");
  }

  return window.localStorage;
}

export function serializeE2eePublicKeyJwk(publicKeyJwk) {
  return JSON.stringify(publicKeyJwk || {});
}

async function importPublicKeyFromJwk(publicKeyJwk) {
  return crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["encrypt"]
  );
}

async function importPrivateKeyFromJwk(privateKeyJwk) {
  return crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    true,
    ["decrypt"]
  );
}

async function generateDeviceKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function ensureE2eeDeviceKeyPair() {
  const localStorage = getLocalStorage();
  const storedPublicJwk = parseStoredJwk(localStorage.getItem(DEVICE_PUBLIC_KEY_STORAGE));
  const storedPrivateJwk = parseStoredJwk(localStorage.getItem(DEVICE_PRIVATE_KEY_STORAGE));

  if (storedPublicJwk && storedPrivateJwk) {
    const publicKey = await importPublicKeyFromJwk(storedPublicJwk);
    const privateKey = await importPrivateKeyFromJwk(storedPrivateJwk);

    return {
      publicKey,
      privateKey,
      publicKeyJwk: storedPublicJwk,
      privateKeyJwk: storedPrivateJwk,
      publicKeySerialized: serializeE2eePublicKeyJwk(storedPublicJwk)
    };
  }

  const keyPair = await generateDeviceKeyPair();
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  localStorage.setItem(DEVICE_PUBLIC_KEY_STORAGE, JSON.stringify(publicKeyJwk));
  localStorage.setItem(DEVICE_PRIVATE_KEY_STORAGE, JSON.stringify(privateKeyJwk));

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyJwk,
    privateKeyJwk,
    publicKeySerialized: serializeE2eePublicKeyJwk(publicKeyJwk)
  };
}

export async function encryptConversationSecretForPublicKey(secret, publicKeySerialized) {
  const normalizedSecret = ensureManagedConversationSecret(secret);
  if (!normalizedSecret) {
    throw new Error("A managed conversation secret is required");
  }

  const publicKeyJwk = parseStoredJwk(publicKeySerialized);
  if (!publicKeyJwk) {
    throw new Error("Invalid public key format");
  }

  const publicKey = await importPublicKeyFromJwk(publicKeyJwk);
  const secretBytes = decodeManagedConversationSecret(normalizedSecret);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    publicKey,
    secretBytes
  );

  return toBase64(new Uint8Array(encryptedBuffer));
}

export async function decryptConversationSecretEnvelope(encryptedKey, privateKeyJwk) {
  const privateKey = await importPrivateKeyFromJwk(privateKeyJwk);
  const encryptedBytes = fromBase64(String(encryptedKey || ""));
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    privateKey,
    encryptedBytes
  );

  return `${MANAGED_SECRET_PREFIX}${toBase64(new Uint8Array(decryptedBuffer))}`;
}

export function isEncryptedEnvelope(value) {
  return String(value || "").startsWith(ENVELOPE_PREFIX);
}

export async function encryptMessageContent(plainText, secret, conversationId) {
  const text = String(plainText || "");
  if (!text.trim()) {
    return "";
  }

  const key = await deriveConversationKey(secret, conversationId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoded
  );

  const payload = `${toBase64(iv)}.${toBase64(new Uint8Array(encryptedBuffer))}`;
  return `${ENVELOPE_PREFIX}${payload}`;
}

export async function decryptMessageContent(cipherText, secret, conversationId) {
  const value = String(cipherText || "");
  if (!isEncryptedEnvelope(value)) {
    return value;
  }

  const payload = value.slice(ENVELOPE_PREFIX.length);
  const [ivEncoded, encryptedEncoded] = payload.split(".");
  if (!ivEncoded || !encryptedEncoded) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = fromBase64(ivEncoded);
  const encryptedBytes = fromBase64(encryptedEncoded);
  const key = await deriveConversationKey(secret, conversationId);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export async function encryptFileAttachment(file, secret, conversationId) {
  const key = await deriveConversationKey(secret, conversationId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sourceBuffer = await file.arrayBuffer();
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    sourceBuffer
  );

  const encryptedFile = new File([encryptedBuffer], `${file.name}.enc`, {
    type: "application/octet-stream"
  });

  return {
    encryptedFile,
    metadata: {
      isEncrypted: true,
      encryptionVersion: FILE_ENCRYPTION_VERSION,
      encryptionAlgorithm: FILE_ENCRYPTION_ALGORITHM,
      encryptionIv: toBase64(iv),
      originalMimeType: file.type || "application/octet-stream",
      originalName: file.name
    }
  };
}

export async function decryptFileAttachment(encryptedBuffer, metadata, secret, conversationId) {
  if (!metadata?.isEncrypted) {
    return encryptedBuffer;
  }

  const iv = fromBase64(String(metadata.encryptionIv || ""));
  const key = await deriveConversationKey(secret, conversationId);
  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encryptedBuffer
  );
}
