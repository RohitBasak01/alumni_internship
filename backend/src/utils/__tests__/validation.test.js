import { isEmail, isNonEmptyString, isObjectIdLike, isPositiveYear, hasMinLength } from "../validation.js";

describe("Validation Utilities", () => {
  describe("isEmail", () => {
    it("should return true for valid email addresses", () => {
      expect(isEmail("test@example.com")).toBe(true);
      expect(isEmail("user.name@domain.co.uk")).toBe(true);
      expect(isEmail("user+tag@example.org")).toBe(true);
    });

    it("should return false for invalid email addresses", () => {
      expect(isEmail("invalid-email")).toBe(false);
      expect(isEmail("user@")).toBe(false);
      expect(isEmail("@domain.com")).toBe(false);
      expect(isEmail("")).toBe(false);
      expect(isEmail(null)).toBe(false);
      expect(isEmail(undefined)).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    it("should return true for non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("  spaced  ")).toBe(true);
    });

    it("should return false for empty strings or non-strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
    });
  });

  describe("isObjectIdLike", () => {
    it("should return true for valid MongoDB ObjectId strings", () => {
      expect(isObjectIdLike("507f1f77bcf86cd799439011")).toBe(true);
      expect(isObjectIdLike("abcdef123456789012345678")).toBe(true);
      expect(isObjectIdLike("ABCDEF123456789012345678")).toBe(true);
    });

    it("should return false for invalid ObjectId strings", () => {
      expect(isObjectIdLike("")).toBe(false);
      expect(isObjectIdLike("123")).toBe(false);
      expect(isObjectIdLike("507f1f77bcf86cd79943901")).toBe(false); // 23 chars
      expect(isObjectIdLike("507f1f77bcf86cd7994390112")).toBe(false); // 25 chars
      expect(isObjectIdLike("507f1f77bcf86cd79943901g")).toBe(false); // invalid char 'g'
      expect(isObjectIdLike(null)).toBe(false);
      expect(isObjectIdLike(undefined)).toBe(false);
    });
  });

  describe("isPositiveYear", () => {
    it("should return true for valid years between 1900 and 2100", () => {
      expect(isPositiveYear(2024)).toBe(true);
      expect(isPositiveYear(1999)).toBe(true);
      expect(isPositiveYear(2050)).toBe(true);
      expect(isPositiveYear("2024")).toBe(true);
    });

    it("should return false for invalid years", () => {
      expect(isPositiveYear(1899)).toBe(false);
      expect(isPositiveYear(2101)).toBe(false);
      expect(isPositiveYear(0)).toBe(false);
      expect(isPositiveYear(-2024)).toBe(false);
      expect(isPositiveYear("invalid")).toBe(false);
      expect(isPositiveYear(null)).toBe(false);
      expect(isPositiveYear(undefined)).toBe(false);
    });
  });

  describe("hasMinLength", () => {
    it("should return true for strings with sufficient length", () => {
      expect(hasMinLength("hello", 3)).toBe(true);
      expect(hasMinLength("hello", 5)).toBe(true);
      expect(hasMinLength("  spaced  ", 5)).toBe(true);
    });

    it("should return false for strings with insufficient length", () => {
      expect(hasMinLength("hi", 3)).toBe(false);
      expect(hasMinLength("", 1)).toBe(false);
      expect(hasMinLength("   ", 4)).toBe(false);
      expect(hasMinLength(null, 1)).toBe(false);
      expect(hasMinLength(undefined, 1)).toBe(false);
      expect(hasMinLength(123, 1)).toBe(false);
    });
  });
});