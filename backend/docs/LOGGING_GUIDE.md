# Structured Logging Guide

This document describes the structured logging system implemented in the Alumni Network Platform using Winston.

## Overview

The platform uses Winston for structured logging, providing:

- JSON-formatted logs in production for easy parsing by log aggregators
- Human-readable colored logs in development
- Log rotation and file management
- Contextual logging with request IDs, user IDs, tenant IDs, etc.
- Different log levels for different environments

## Log Levels

The system supports the following log levels (from most to least severe):

1. **error** - Runtime errors that should be investigated
2. **warn** - Unexpected but not critical issues
3. **info** - General operational information (default in production)
4. **http** - HTTP request logging
5. **debug** - Detailed information for development (default in development)

## Configuration

### Environment Variables

| Variable    | Description                      | Default                      |
| ----------- | -------------------------------- | ---------------------------- |
| `LOG_LEVEL` | Minimum log level to record      | `info` (prod), `debug` (dev) |
| `NODE_ENV`  | Environment (affects log format) | `development`                |

### File Output

Logs are written to the `backend/logs/` directory:

- `error.log` - Only error-level logs
- `combined.log` - All logs (info level and above)
- `exceptions.log` - Uncaught exceptions
- `receptions.log` - Unhandled promise rejections

Files are rotated when they reach 5MB, keeping up to 5 backup files.

## Usage

### Importing the Logger

```javascript
import logger, {
  logError,
  logRequest,
  logAuth,
  logEmail,
  logCache,
  logSocket,
  logTenant,
  logDatabase
} from "../utils/logger.js";
```

### Basic Logging

```javascript
// Different log levels
logger.error("Error message", { context: "additional data" });
logger.warn("Warning message", { userId: "123" });
logger.info("Informational message", { action: "user_login" });
logger.http("HTTP request");
logger.debug("Debug information", { details: "verbose" });

// Using helper functions
logError(error, { context: "database operation", query: { id: "123" } });
logAuth("login", userId, true, { ip: "127.0.0.1" });
```

### HTTP Request Logging

The system automatically logs HTTP requests with:

- Request method and URL
- Response status code
- Duration
- User ID (if authenticated)
- Tenant ID
- IP address
- User agent

In development, this uses Morgan with Winston stream. In production, it uses structured request logging middleware.

### Error Logging

Always use `logError` for errors to include proper context:

```javascript
try {
  // Some operation
} catch (error) {
  logError(error, {
    context: "operation name",
    userId: req.user?._id,
    tenantId: req.tenant?._id,
    additionalData: "..."
  });
}
```

### Database Operation Logging

For performance monitoring, you can log database operations:

```javascript
const start = Date.now();
const result = await User.find({ active: true });
const duration = Date.now() - start;

logDatabase("find", "User", { active: true }, result, duration);
```

## Log Format

### Development Format (Human Readable)

```
2026-05-07 10:58:01:751 info: Server running on port 5000 {"port":5000,"nodeEnv":"development","logLevel":"debug"}
```

### Production Format (JSON)

```json
{
  "level": "info",
  "message": "Server running on port 5000",
  "timestamp": "2026-05-07T10:58:01.751Z",
  "service": "alumni-network-api",
  "port": 5000,
  "nodeEnv": "production",
  "logLevel": "info"
}
```

## Contextual Information

All logs automatically include:

- `timestamp` - ISO 8601 timestamp
- `service` - "alumni-network-api"
- `environment` - Derived from NODE_ENV

Additional context can be added as needed:

- `requestId` - Unique request identifier
- `userId` - Authenticated user ID
- `tenantId` - Current tenant ID
- `ip` - Client IP address
- `userAgent` - Browser/user agent

## Best Practices

1. **Use appropriate log levels**
   - `error` for actual errors that need attention
   - `warn` for potential issues
   - `info` for normal operations
   - `debug` for development details

2. **Include context**
   - Always include relevant IDs (user, tenant, request)
   - Add operation-specific data
   - Mask sensitive information (passwords, tokens)

3. **Structured data**
   - Use objects for additional data, not string concatenation
   - This enables better searching and filtering in log aggregators

4. **Performance considerations**
   - Avoid expensive operations in log statements
   - Use conditional logging for debug-level logs
   - Be mindful of log volume in production

## Integration with Monitoring Tools

### Log Aggregators

The JSON format in production is compatible with:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **AWS CloudWatch Logs**
- **Google Cloud Logging**

### Error Tracking

For error tracking, consider integrating with:

- **Sentry** (see `SENTRY_DSN` environment variable)
- **Rollbar**
- **Bugsnag**

## Testing

Logs are suppressed in test environment (`NODE_ENV=test`) to `warn` level by default. You can override with `LOG_LEVEL` environment variable.

## Troubleshooting

### No Logs Appearing

1. Check that `LOG_LEVEL` is set appropriately
2. Verify the `logs/` directory exists and is writable
3. Check `NODE_ENV` setting

### Log Files Too Large

1. Logs automatically rotate at 5MB
2. Only 5 backup files are kept
3. Adjust `maxsize` and `maxFiles` in `logger.js` if needed

### Missing Context

Ensure middleware is properly configured:

- `attachRequestContext` adds `requestId`
- `resolveTenant` adds `tenantId`
- Authentication middleware adds `userId`

## Related Documentation

- [Environment Variables](../ENVIRONMENT_VARIABLES.md)
- [Error Handling](../ERROR_HANDLING.md)
- [Monitoring & Observability](../MONITORING.md)
