/**
 * Utility for generating user-friendly error messages
 * Provides consistent, actionable error messages across the application
 */

/**
 * Extract the most relevant error message from an error object
 * @param {Error|object} error - The error object
 * @param {string} defaultMessage - Default message if no error details found
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error, defaultMessage = "Something went wrong. Please try again.") {
  if (!error) return defaultMessage;

  // Check for network errors
  if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  // Check for timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return "Request timed out. The server is taking too long to respond. Please try again.";
  }

  // Check for HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    
    switch (status) {
      case 400:
        return extract400Message(error) || "Invalid request. Please check your input and try again.";
      case 401:
        return "Your session has expired or you're not authorized. Please log in again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "A conflict occurred. This may be because the resource already exists.";
      case 422:
        return extractValidationMessage(error) || "Validation failed. Please check your input.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Our team has been notified. Please try again later.";
      case 502:
      case 503:
      case 504:
        return "Service temporarily unavailable. Please try again in a few moments.";
      default:
        // Fall through to generic error extraction
    }
  }

  // Try to extract message from common error structures
  const message = 
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.response?.data?.details?.[0]?.message ||
    error.response?.data?.details?.[0] ||
    error.data?.message ||
    error.message;

  if (message && typeof message === 'string') {
    // Clean up technical error messages for users
    return cleanTechnicalMessage(message);
  }

  return defaultMessage;
}

/**
 * Extract meaningful message from 400 Bad Request errors
 */
function extract400Message(error) {
  const data = error.response?.data;
  
  if (!data) return null;
  
  // Common authentication errors
  if (data.message?.includes('Invalid credentials') || 
      data.message?.includes('incorrect password') ||
      data.message?.includes('User not found')) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  
  if (data.message?.includes('email') && data.message?.includes('already exists')) {
    return "An account with this email already exists. Please use a different email or try logging in.";
  }
  
  if (data.message?.includes('required') || data.message?.includes('missing')) {
    return "Please fill in all required fields.";
  }
  
  return data.message || null;
}

/**
 * Extract validation error messages
 */
function extractValidationMessage(error) {
  const details = error.response?.data?.details;
  
  if (!details || !Array.isArray(details)) {
    return error.response?.data?.message || null;
  }
  
  // Combine multiple validation errors
  const messages = details
    .filter(detail => detail.message || detail.msg)
    .map(detail => detail.message || detail.msg)
    .filter(msg => msg && typeof msg === 'string');
  
  if (messages.length === 0) return null;
  
  if (messages.length === 1) {
    return cleanTechnicalMessage(messages[0]);
  }
  
  return `Multiple issues found: ${messages.slice(0, 3).join(', ')}${messages.length > 3 ? '...' : ''}`;
}

/**
 * Clean technical error messages for user display
 */
function cleanTechnicalMessage(message) {
  if (!message || typeof message !== 'string') return message;
  
  // Remove technical prefixes
  const cleaned = message
    .replace(/^Error:\s*/i, '')
    .replace(/^ValidationError:\s*/i, '')
    .replace(/^[A-Za-z]+Error:\s*/i, '')
    .trim();
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Get actionable suggestion based on error type
 */
export function getErrorSuggestion(error) {
  if (!error) return "Please try again.";
  
  const message = String(error.message || '').toLowerCase();
  const status = error.response?.status;
  
  if (status === 401 || message.includes('unauthorized') || message.includes('token')) {
    return "Try logging out and back in, or clearing your browser cookies.";
  }
  
  if (status === 403 || message.includes('forbidden') || message.includes('permission')) {
    return "Contact your administrator if you believe you should have access.";
  }
  
  if (status === 404 || message.includes('not found')) {
    return "The resource may have been moved or deleted. Check the URL or navigate back.";
  }
  
  if (status === 429 || message.includes('too many requests')) {
    return "Wait a few minutes before trying again.";
  }
  
  if (message.includes('network') || message.includes('connection') || message.includes('offline')) {
    return "Check your internet connection and try again.";
  }
  
  if (message.includes('timeout')) {
    return "The server is taking longer than expected. Try again in a moment.";
  }
  
  return "Refresh the page or try again in a few moments.";
}

/**
 * Format error for display in UI with icon and suggestion
 */
export function formatErrorForDisplay(error, defaultMessage = "Something went wrong") {
  const message = getErrorMessage(error, defaultMessage);
  const suggestion = getErrorSuggestion(error);
  
  return {
    message,
    suggestion,
    status: error.response?.status,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error) {
  if (!error) return true;
  
  const status = error.response?.status;
  const message = String(error.message || '').toLowerCase();
  
  // Non-recoverable errors
  if (status === 403 && message.includes('permanent')) return false;
  if (status === 410) return false; // Gone
  if (message.includes('permanent') || message.includes('irrecoverable')) return false;
  
  // Most errors are recoverable
  return true;
}