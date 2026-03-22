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
