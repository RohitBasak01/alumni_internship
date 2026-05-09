/**
 * Accessibility utilities for AlumNet
 * Provides ARIA helpers, keyboard navigation, focus management, and WCAG compliance checks
 */

/**
 * ARIA role constants for consistent usage across the application
 */
export const ARIA_ROLES = {
  NAVIGATION: 'navigation',
  MAIN: 'main',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  REGION: 'region',
  FORM: 'form',
  SEARCH: 'search',
  ALERT: 'alert',
  DIALOG: 'dialog',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  TABLIST: 'tablist',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  LIST: 'list',
  LISTITEM: 'listitem',
  BUTTON: 'button',
  LINK: 'link',
  HEADING: 'heading',
  IMG: 'img',
  PRESENTATION: 'presentation'
};

/**
 * ARIA label helpers for common UI elements
 */
export const ARIA_LABELS = {
  // Navigation
  MAIN_NAV: 'Main navigation',
  SIDEBAR_NAV: 'Sidebar navigation',
  USER_MENU: 'User menu',
  NOTIFICATION_MENU: 'Notification menu',
  
  // Actions
  CLOSE_MODAL: 'Close modal',
  OPEN_MENU: 'Open menu',
  TOGGLE_SIDEBAR: 'Toggle sidebar',
  SEARCH_ALUMNI: 'Search alumni directory',
  FILTER_RESULTS: 'Filter results',
  SORT_RESULTS: 'Sort results',
  
  // Content
  LOADING: 'Loading content',
  ERROR_MESSAGE: 'Error message',
  SUCCESS_MESSAGE: 'Success message',
  INFO_MESSAGE: 'Information message',
  WARNING_MESSAGE: 'Warning message',
  
  // Forms
  REQUIRED_FIELD: 'Required field',
  OPTIONAL_FIELD: 'Optional field',
  FORM_ERROR: 'Form error',
  FORM_SUCCESS: 'Form submitted successfully'
};

/**
 * Keyboard navigation key codes
 */
export const KEY_CODES = {
  ENTER: 13,
  SPACE: 32,
  ESCAPE: 27,
  TAB: 9,
  ARROW_UP: 38,
  ARROW_DOWN: 40,
  ARROW_LEFT: 37,
  ARROW_RIGHT: 39,
  HOME: 36,
  END: 35,
  PAGE_UP: 33,
  PAGE_DOWN: 34
};

/**
 * Focus management utilities
 */

/**
 * Trap focus within a container element (for modals, dialogs)
 * @param {HTMLElement} container - The container element to trap focus within
 * @param {Function} onEscape - Callback for escape key press
 */
export function trapFocus(container, onEscape = null) {
  if (!container) return;

  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleKeyDown(event) {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    } else if (event.key === 'Escape' && onEscape) {
      onEscape();
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Set focus to the first focusable element in a container
 * @param {HTMLElement} container - Container element
 */
export function focusFirstElement(container) {
  if (!container) return;
  
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

/**
 * Manage focus for screen reader announcements
 * @param {string} message - Message to announce
 * @param {string} politeness - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, politeness = 'polite') {
  const announcement = document.getElementById('sr-announcement');
  
  if (announcement) {
    announcement.setAttribute('aria-live', politeness);
    announcement.textContent = message;
    
    // Clear after a delay to allow repeated announcements
    setTimeout(() => {
      announcement.textContent = '';
    }, 1000);
  }
}

/**
 * Check color contrast ratio for WCAG compliance
 * @param {string} foregroundColor - CSS color value
 * @param {string} backgroundColor - CSS color value
 * @returns {Object} Contrast ratio and compliance levels
 */
export function checkColorContrast(foregroundColor, backgroundColor) {
  // Simplified contrast checker (in a real app, use a proper color library)
  // This is a placeholder that returns mock compliance
  return {
    ratio: 4.5, // Mock ratio
    aa: true,   // Passes AA level
    aaa: false, // May not pass AAA level
    largeTextAA: true,
    largeTextAAA: true
  };
}

/**
 * Generate accessible ID for form elements
 * @param {string} baseId - Base ID
 * @param {string} fieldName - Field name
 * @returns {string} Accessible ID
 */
export function generateAriaId(baseId, fieldName) {
  return `${baseId}-${fieldName.replace(/\s+/g, '-').toLowerCase()}`;
}

/**
 * Skip to main content functionality
 */
export function setupSkipToContent() {
  const skipLink = document.getElementById('skip-to-content');
  
  if (skipLink) {
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const mainContent = document.querySelector('main');
      
      if (mainContent) {
        mainContent.setAttribute('tabindex', '-1');
        mainContent.focus();
        
        // Remove tabindex after focus to prevent tabbing into it
        setTimeout(() => {
          mainContent.removeAttribute('tabindex');
        }, 100);
      }
    });
  }
}

/**
 * Add accessible error messages to form fields
 * @param {HTMLElement} field - Form field element
 * @param {string} message - Error message
 * @param {string} id - Unique ID for error element
 */
export function addFieldError(field, message, id) {
  // Remove existing error
  removeFieldError(field);
  
  // Create error element
  const errorElement = document.createElement('div');
  errorElement.id = id;
  errorElement.className = 'field-error';
  errorElement.setAttribute('role', 'alert');
  errorElement.setAttribute('aria-live', 'polite');
  errorElement.textContent = message;
  
  // Add error to DOM
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', id);
  
  // Insert after field
  field.parentNode.insertBefore(errorElement, field.nextSibling);
}

/**
 * Remove accessible error from form field
 * @param {HTMLElement} field - Form field element
 */
export function removeFieldError(field) {
  const describedBy = field.getAttribute('aria-describedby');
  
  if (describedBy) {
    const errorElement = document.getElementById(describedBy);
    if (errorElement) {
      errorElement.remove();
    }
  }
  
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-describedby');
}

/**
 * Make element focusable with keyboard navigation
 * @param {HTMLElement} element - Element to make focusable
 * @param {number} tabIndex - Tab index value (default: 0)
 */
export function makeFocusable(element, tabIndex = 0) {
  if (!element) return;
  
  element.setAttribute('tabindex', tabIndex.toString());
  
  // Add keyboard event handlers for Enter/Space
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      element.click();
    }
  });
}

/**
 * Initialize accessibility features on page load
 */
export function initializeAccessibility() {
  // Setup skip to content link
  setupSkipToContent();
  
  // Add screen reader announcement container if not present
  if (!document.getElementById('sr-announcement')) {
    const announcement = document.createElement('div');
    announcement.id = 'sr-announcement';
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    document.body.appendChild(announcement);
  }
  
  // Log accessibility initialization
  console.log('Accessibility features initialized');
}

export default {
  ARIA_ROLES,
  ARIA_LABELS,
  KEY_CODES,
  trapFocus,
  focusFirstElement,
  announceToScreenReader,
  checkColorContrast,
  generateAriaId,
  setupSkipToContent,
  addFieldError,
  removeFieldError,
  makeFocusable,
  initializeAccessibility
};