import { logError } from "../utils/logger.js";
import { captureError } from "../utils/sentry.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.requestId
  });
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let details = error.details || undefined;

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors || {}).map((item) => item.message);
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with one of these values already exists";
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  // Log the error using structured logger
  const context = {
    requestId: _req.requestId,
    statusCode,
    method: _req.method,
    path: _req.originalUrl,
    userId: _req.user ? _req.user._id : 'anonymous',
    tenantId: _req.tenant ? _req.tenant._id : 'unknown',
    ip: _req.ip,
    userAgent: _req.get('user-agent'),
    details
  };

  logError(error, context);

  // Capture server errors (5xx) in Sentry
  if (statusCode >= 500) {
    const sentryContext = {
      user: _req.user ? {
        id: _req.user._id,
        email: _req.user.email,
        username: _req.user.username,
        tenantId: _req.tenant?._id
      } : undefined,
      request: {
        method: _req.method,
        url: _req.originalUrl,
        headers: _req.headers,
        query: _req.query,
        body: _req.body,
        ip: _req.ip,
        userAgent: _req.get('user-agent')
      },
      tags: {
        statusCode: statusCode.toString(),
        errorType: error.name || 'Unknown',
        tenantId: _req.tenant?._id || 'unknown',
        route: _req.originalUrl
      },
      extra: {
        requestId: _req.requestId,
        details,
        stack: error.stack
      }
    };

    captureError(error, sentryContext);
  }

  const isProduction = process.env.NODE_ENV === "production";

  res.status(statusCode).json({
    message,
    requestId: _req.requestId,
    ...(details ? { details } : {}),
    // Never expose stack traces in production
    ...((!isProduction && error.stack) ? { stack: error.stack } : {})
  });
}
