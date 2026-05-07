/**
 * Comprehensive form validation utilities for client-side validation
 * Mirrors backend validation logic to provide consistent validation
 */

/**
 * Validates if a value is a non-empty string
 * @param {string} value - The value to validate
 * @returns {boolean} True if valid
 */
export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validates email format
 * @param {string} value - Email to validate
 * @returns {boolean} True if valid email
 */
export function isEmail(value) {
  return isNonEmptyString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Validates password strength
 * @param {string} value - Password to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with errors
 */
export function validatePassword(value) {
  const errors = [];
  
  if (!isNonEmptyString(value)) {
    errors.push("Password is required");
    return { valid: false, errors };
  }
  
  if (value.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(value)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(value)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(value)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    errors.push("Password must contain at least one special character");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates string length constraints
 * @param {string} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum length (optional)
 * @param {number} options.max - Maximum length (optional)
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateLength(value, { min, max }) {
  const errors = [];
  
  if (min !== undefined && (!isNonEmptyString(value) || value.trim().length < min)) {
    errors.push(`Must be at least ${min} characters`);
  }
  
  if (max !== undefined && isNonEmptyString(value) && value.trim().length > max) {
    errors.push(`Must be at most ${max} characters`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates URL format
 * @param {string} value - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isUrl(value) {
  if (!isNonEmptyString(value)) return false;
  
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates phone number format (basic international format)
 * @param {string} value - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export function isPhoneNumber(value) {
  if (!isNonEmptyString(value)) return false;
  
  // Basic international phone number validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleaned = value.replace(/[\s\-()]/g, '');
  return phoneRegex.test(cleaned);
}

/**
 * Validates date is in the past (for birth dates, etc.)
 * @param {string|Date} value - Date to validate
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(value) {
  if (!value) return false;
  
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return !isNaN(date.getTime()) && date < today;
}

/**
 * Validates year is within reasonable range (1900-2100)
 * @param {string|number} value - Year to validate
 * @returns {boolean} True if valid year
 */
export function isPositiveYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2100;
}

/**
 * Creates a validation schema for form fields
 * @param {Object} schema - Field validation schema
 * @returns {Function} Validation function
 */
export function createValidator(schema) {
  return function validateForm(formData) {
    const errors = {};
    let isValid = true;
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = formData[field];
      const fieldErrors = [];
      
      for (const rule of rules) {
        const result = rule(value, formData);
        if (result !== true) {
          fieldErrors.push(result);
        }
      }
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
        isValid = false;
      }
    }
    
    return { isValid, errors };
  };
}

/**
 * Common validation rules factory
 */
export const rules = {
  required: (fieldName = "This field") => (value) => {
    if (!isNonEmptyString(value) && value !== false && value !== 0) {
      return `${fieldName} is required`;
    }
    return true;
  },
  
  email: (fieldName = "Email") => (value) => {
    if (isNonEmptyString(value) && !isEmail(value)) {
      return `${fieldName} must be a valid email address`;
    }
    return true;
  },
  
  minLength: (min, fieldName = "Field") => (value) => {
    if (isNonEmptyString(value) && value.trim().length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return true;
  },
  
  maxLength: (max, fieldName = "Field") => (value) => {
    if (isNonEmptyString(value) && value.trim().length > max) {
      return `${fieldName} must be at most ${max} characters`;
    }
    return true;
  },
  
  password: () => (value) => {
    const { valid, errors } = validatePassword(value);
    if (!valid) {
      return errors[0] || "Invalid password";
    }
    return true;
  },
  
  url: (fieldName = "URL") => (value) => {
    if (isNonEmptyString(value) && !isUrl(value)) {
      return `${fieldName} must be a valid URL`;
    }
    return true;
  },
  
  phone: (fieldName = "Phone number") => (value) => {
    if (isNonEmptyString(value) && !isPhoneNumber(value)) {
      return `${fieldName} must be a valid phone number`;
    }
    return true;
  },
  
  pastDate: (fieldName = "Date") => (value) => {
    if (isNonEmptyString(value) && !isPastDate(value)) {
      return `${fieldName} must be in the past`;
    }
    return true;
  },
  
  positiveYear: (fieldName = "Year") => (value) => {
    if (isNonEmptyString(value) && !isPositiveYear(value)) {
      return `${fieldName} must be between 1900 and 2100`;
    }
    return true;
  },
  
  match: (otherField, fieldName = "Field") => (value, formData) => {
    if (value !== formData[otherField]) {
      return `${fieldName} must match`;
    }
    return true;
  }
};

/**
 * Predefined validation schemas for common forms
 */
export const schemas = {
  login: createValidator({
    email: [
      rules.required("Email"),
      rules.email("Email")
    ],
    password: [
      rules.required("Password")
    ]
  }),
  
  registration: createValidator({
    email: [
      rules.required("Email"),
      rules.email("Email")
    ],
    password: [
      rules.required("Password"),
      rules.password()
    ],
    confirmPassword: [
      rules.required("Confirm password"),
      rules.match("password", "Passwords")
    ],
    firstName: [
      rules.required("First name"),
      rules.minLength(2, "First name")
    ],
    lastName: [
      rules.required("Last name"),
      rules.minLength(2, "Last name")
    ]
  }),
  
  profile: createValidator({
    firstName: [
      rules.required("First name"),
      rules.minLength(2, "First name"),
      rules.maxLength(50, "First name")
    ],
    lastName: [
      rules.required("Last name"),
      rules.minLength(2, "Last name"),
      rules.maxLength(50, "Last name")
    ],
    email: [
      rules.required("Email"),
      rules.email("Email")
    ],
    phone: [
      rules.phone("Phone number")
    ],
    linkedinUrl: [
      rules.url("LinkedIn URL")
    ],
    graduationYear: [
      rules.positiveYear("Graduation year")
    ]
  })
};

/**
 * Real-time validation hook for form fields
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation utilities
 */
export function useFormValidation(schema) {
  const validate = createValidator(schema);
  
  return {
    validate,
    validateField: (field, value, formData) => {
      const fieldRules = schema[field];
      if (!fieldRules) return { valid: true, errors: [] };
      
      const errors = [];
      for (const rule of fieldRules) {
        const result = rule(value, formData);
        if (result !== true) {
          errors.push(result);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    }
  };
}