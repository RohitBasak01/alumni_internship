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

  // Server-side structured error log
  const isProduction = process.env.NODE_ENV === "production";
  const logPayload = {
    level: "error",
    requestId: _req.requestId,
    statusCode,
    message,
    method: _req.method,
    path: _req.originalUrl,
    timestamp: new Date().toISOString()
  };

  if (!isProduction && error.stack) {
    logPayload.stack = error.stack;
  }

  console.error(JSON.stringify(logPayload));

  res.status(statusCode).json({
    message,
    requestId: _req.requestId,
    ...(details ? { details } : {}),
    // Never expose stack traces in production
    ...((!isProduction && error.stack) ? { stack: error.stack } : {})
  });
}
