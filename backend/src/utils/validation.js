export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isEmail(value) {
  return isNonEmptyString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isObjectIdLike(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

export function isPositiveYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2100;
}

export function hasMinLength(value, min) {
  return typeof value === "string" && value.trim().length >= min;
}

export function hasMaxLength(value, max) {
  return typeof value === "string" && value.trim().length <= max;
}

export function isStrongPassword(value) {
  if (!isNonEmptyString(value) || value.length < 8) {
    return false;
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(value)) {
    return false;
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(value)) {
    return false;
  }
  
  // Check for at least one digit
  if (!/\d/.test(value)) {
    return false;
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    return false;
  }
  
  return true;
}

export function isUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isPhoneNumber(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  
  // Basic phone number validation - allows international formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const digitsOnly = value.replace(/\D/g, '');
  return phoneRegex.test(digitsOnly) && digitsOnly.length >= 10;
}

export function isDate(value) {
  if (!value) return false;
  
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isFutureDate(value) {
  if (!isDate(value)) return false;
  
  const date = new Date(value);
  const now = new Date();
  return date > now;
}

export function isPastDate(value) {
  if (!isDate(value)) return false;
  
  const date = new Date(value);
  const now = new Date();
  return date < now;
}

export function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}

export function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

export function isNonNegativeNumber(value) {
  return isNumber(value) && value >= 0;
}

export function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

export function isInRange(value, min, max) {
  return isNumber(value) && value >= min && value <= max;
}

export function isAlphaNumeric(value) {
  return isNonEmptyString(value) && /^[a-zA-Z0-9]+$/.test(value);
}

export function sanitizeInput(value) {
  if (typeof value !== "string") return value;
  
  // Remove potentially dangerous characters
  return value
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}
