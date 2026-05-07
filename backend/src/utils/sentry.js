/**
 * Sentry error tracking and performance monitoring utility.
 * Integrates with Winston logger for structured error reporting.
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import logger from './logger.js';

/**
 * Initialize Sentry with configuration based on environment.
 * Should be called early in the application startup.
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.npm_package_version || '1.0.0';
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1;
  const profilesSampleRate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1;

  if (!dsn) {
    logger.warn('SENTRY_DSN not set. Sentry error tracking disabled.');
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      release,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app: require('express') }),
        // Add profiling integration
        nodeProfilingIntegration(),
      ],
      // Performance monitoring
      tracesSampleRate,
      // Set sampling rate for profiling
      profilesSampleRate,
      // Capture 100% of transactions for health check endpoint (optional)
      tracePropagationTargets: [/^https:\/\/[^/]*\/api/],
      // Ignore certain errors (e.g., 404s, validation errors)
      ignoreErrors: [
        'ValidationError',
        'UnauthorizedError',
        'NotFoundError',
        /status code 404/,
        /status code 401/,
        /status code 403/,
      ],
      // Attach user context when available
      beforeSend(event) {
        // Filter out sensitive information
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        if (event.request?.headers?.authorization) {
          delete event.request.headers.authorization;
        }
        if (event.request?.headers?.['x-api-key']) {
          delete event.request.headers['x-api-key'];
        }
        return event;
      },
    });

    logger.info('Sentry initialized successfully', {
      environment,
      release,
      tracesSampleRate,
      profilesSampleRate,
    });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error: error.message });
    return false;
  }
}

/**
 * Capture an error with additional context.
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context (user, request, tags, etc.)
 */
export function captureError(error, context = {}) {
  if (!Sentry.getCurrentHub().getClient()) {
    // Sentry not initialized, log locally
    logger.error('Error (Sentry not initialized)', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
    return;
  }

  const { user, request, tags, extra, level = 'error' } = context;

  Sentry.withScope((scope) => {
    // Set user context
    if (user) {
      scope.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        tenantId: user.tenantId,
      });
    }

    // Set request context
    if (request) {
      scope.addEventProcessor((event) => {
        Sentry.addRequestDataToEvent(event, request);
        return event;
      });
    }

    // Set tags
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Set extra data
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Set severity level
    scope.setLevel(level);

    // Capture the error
    Sentry.captureException(error);
  });

  // Also log locally for immediate visibility
  logger.error('Error captured by Sentry', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

/**
 * Capture a message (non-error event).
 * @param {string} message - The message to capture
 * @param {Object} context - Additional context
 */
export function captureMessage(message, context = {}) {
  if (!Sentry.getCurrentHub().getClient()) {
    logger.info('Message (Sentry not initialized)', { message, ...context });
    return;
  }

  const { level = 'info', tags, extra } = context;

  Sentry.withScope((scope) => {
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for all subsequent events.
 * @param {Object} user - User object with id, email, etc.
 */
export function setUserContext(user) {
  if (!Sentry.getCurrentHub().getClient()) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    tenantId: user.tenantId,
  });
}

/**
 * Clear user context.
 */
export function clearUserContext() {
  if (!Sentry.getCurrentHub().getClient()) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracing user actions.
 * @param {Object} breadcrumb - Breadcrumb object
 */
export function addBreadcrumb(breadcrumb) {
  if (!Sentry.getCurrentHub().getClient()) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Get the current Sentry transaction for performance monitoring.
 * @returns {Object|null} The current transaction or null
 */
export function getCurrentTransaction() {
  if (!Sentry.getCurrentHub().getClient()) {
    return null;
  }

  return Sentry.getCurrentHub().getScope().getTransaction();
}

/**
 * Flush Sentry events (useful for serverless environments).
 * @returns {Promise} Promise that resolves when events are flushed
 */
export async function flushSentry() {
  if (!Sentry.getCurrentHub().getClient()) {
    return Promise.resolve();
  }

  return Sentry.flush();
}

export default {
  initSentry,
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  getCurrentTransaction,
  flushSentry,
};