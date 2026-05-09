# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the Alumni Network Platform.

## Table of Contents

- [Backend Variables](#backend-variables)
- [Frontend Variables](#frontend-variables)
- [Database Variables](#database-variables)
- [Email Configuration](#email-configuration)
- [Payments](#payments)
- [OAuth/Social Login](#oauthsocial-login)
- [Security](#security)
- [Monitoring & Logging](#monitoring--logging)
- [File Upload](#file-upload)
- [Multi-Tenancy](#multi-tenancy)
- [Development](#development)
- [Environment-Specific Files](#environment-specific-files)

## Backend Variables

| Variable                        | Description                        | Default                                | Required             | Example                                             |
| ------------------------------- | ---------------------------------- | -------------------------------------- | -------------------- | --------------------------------------------------- |
| `PORT`                          | Port the backend server listens on | `5000`                                 | No                   | `5000`                                              |
| `NODE_ENV`                      | Node.js environment                | `development`                          | No                   | `production`, `development`, `test`                 |
| `LOG_LEVEL`                     | Logging level                      | `info`                                 | No                   | `debug`, `info`, `warn`, `error`                    |
| `JWT_SECRET`                    | Secret key for JWT token signing   | (none)                                 | **Yes** (production) | `your-very-long-secret-key-here`                    |
| `JWT_REFRESH_SECRET`            | Secret key for refresh tokens      | (none)                                 | No                   | `different-secret-for-refresh`                      |
| `JWT_EXPIRES_IN`                | JWT token expiration time          | `1d`                                   | No                   | `15m`, `1h`, `7d`                                   |
| `JWT_REFRESH_EXPIRES_IN`        | Refresh token expiration           | `7d`                                   | No                   | `30d`, `90d`                                        |
| `AUTH_COOKIE_DOMAIN`            | Domain for auth cookies            | (none)                                 | No                   | `.yourdomain.com`                                   |
| `CLIENT_URL`                    | Frontend client URL                | `http://localhost:5173`                | No                   | `https://alumni.example.com`                        |
| `FRONTEND_URL`                  | Alternative frontend URL           | `http://localhost:5174`                | No                   | `https://alumni.example.com`                        |
| `CORS_ALLOWED_ORIGINS`          | Comma-separated CORS origins       | (derived from CLIENT_URL/FRONTEND_URL) | No                   | `https://app.example.com,https://admin.example.com` |
| `ALLOW_TENANT_HEADER_OVERRIDE`  | Allow X-Tenant-ID header override  | `true` (dev), `false` (prod)           | No                   | `false`                                             |
| `ENABLE_DEV_MOCK_MODE`          | Enable mock data mode              | `false`                                | No                   | `true` (dev only)                                   |
| `DEFAULT_TENANT_ISOLATION_MODE` | Default tenant isolation mode      | `shared`                               | No                   | `shared`, `dedicated`                               |

## Frontend Variables

| Variable                | Description                            | Default                     | Required | Example                                               |
| ----------------------- | -------------------------------------- | --------------------------- | -------- | ----------------------------------------------------- |
| `VITE_API_URL`          | Backend API URL                        | `http://localhost:5000/api` | No       | `https://api.example.com/api`                         |
| `VITE_WS_URL`           | WebSocket URL                          | (derived from API URL)      | No       | `wss://api.example.com`                               |
| `VITE_TENANT_SUBDOMAIN` | Current tenant subdomain               | (empty)                     | No       | `spit`                                                |
| `VITE_TENANT_DOMAIN`    | Tenant domain for multi-tenant routing | (empty)                     | No       | `alumni.example.com`                                  |
| `VITE_DEMO_ACCOUNTS`    | JSON array of demo accounts            | `[]`                        | No       | `[{"email":"demo@example.com","password":"demo123"}]` |

## Database Variables

| Variable                  | Description                                | Default                                    | Required | Example                                |
| ------------------------- | ------------------------------------------ | ------------------------------------------ | -------- | -------------------------------------- |
| `MONGODB_URI`             | Primary MongoDB connection URI             | `mongodb://127.0.0.1:27017/alumni-network` | No       | `mongodb://user:pass@host:27017/db`    |
| `CENTRAL_MONGODB_URI`     | Central database URI (for tenant metadata) | (same as MONGODB_URI)                      | No       | `mongodb://central-host:27017/central` |
| `TENANT_MONGODB_BASE_URI` | Base URI for tenant databases              | (empty)                                    | No       | `mongodb://tenant-host:27017/`         |
| `TENANT_DATABASE_MODE`    | Tenant database mode                       | `shared`                                   | No       | `shared`, `dedicated`                  |
| `MONGO_ROOT_USER`         | MongoDB root username (Docker)             | `admin`                                    | No       | `admin`                                |
| `MONGO_ROOT_PASSWORD`     | MongoDB root password (Docker)             | (none)                                     | No       | `strong-password`                      |
| `MONGO_HOST`              | MongoDB hostname (Docker)                  | `mongodb`                                  | No       | `mongodb`                              |
| `MONGO_PORT`              | MongoDB port (Docker)                      | `27017`                                    | No       | `27017`                                |

## Email Configuration

| Variable      | Description          | Default                                         | Required | Example                                |
| ------------- | -------------------- | ----------------------------------------------- | -------- | -------------------------------------- |
| `SMTP_HOST`   | SMTP server hostname | (empty)                                         | No       | `smtp.gmail.com`                       |
| `SMTP_PORT`   | SMTP server port     | `587`                                           | No       | `587`, `465`                           |
| `SMTP_SECURE` | Use TLS/SSL          | `false`                                         | No       | `true`                                 |
| `SMTP_USER`   | SMTP username        | (empty)                                         | No       | `user@gmail.com`                       |
| `SMTP_PASS`   | SMTP password        | (empty)                                         | No       | `app-specific-password`                |
| `EMAIL_FROM`  | Sender email address | `Alumni Network <no-reply@alumninetwork.local>` | No       | `Alumni Network <noreply@example.com>` |

## Payments

| Variable                  | Description                                      | Default | Required | Example       |
| ------------------------- | ------------------------------------------------ | ------- | -------- | ------------- |
| `STRIPE_SECRET_KEY`       | Stripe secret key for creating checkout sessions | (empty) | No       | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook signing secret                    | (empty) | No       | `whsec_...`   |
| `STRIPE_PRICE_BASIC`      | Optional Stripe recurring price for Basic        | (empty) | No       | `price_...`   |
| `STRIPE_PRICE_PRO`        | Optional Stripe recurring price for Pro          | (empty) | No       | `price_...`   |
| `STRIPE_PRICE_ENTERPRISE` | Optional Stripe recurring price for Enterprise   | (empty) | No       | `price_...`   |

If Stripe keys are not configured, super admin checkout creation returns a mock checkout URL for local development. In production, configure the webhook endpoint as `/api/payments/stripe/webhook`.

## OAuth/Social Login

| Variable                 | Description                  | Default                                                  | Required | Example                                                    |
| ------------------------ | ---------------------------- | -------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID       | (empty)                                                  | No       | `your-google-client-id.apps.googleusercontent.com`         |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret   | (empty)                                                  | No       | `your-google-client-secret`                                |
| `GOOGLE_REDIRECT_URI`    | Google OAuth redirect URI    | `http://localhost:5000/api/auth/oauth/google/callback`   | No       | `https://api.example.com/api/auth/oauth/google/callback`   |
| `LINKEDIN_CLIENT_ID`     | LinkedIn OAuth client ID     | (empty)                                                  | No       | `your-linkedin-client-id`                                  |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret | (empty)                                                  | No       | `your-linkedin-client-secret`                              |
| `LINKEDIN_REDIRECT_URI`  | LinkedIn OAuth redirect URI  | `http://localhost:5000/api/auth/oauth/linkedin/callback` | No       | `https://api.example.com/api/auth/oauth/linkedin/callback` |

## Security

| Variable                  | Description                       | Default           | Required | Example              |
| ------------------------- | --------------------------------- | ----------------- | -------- | -------------------- |
| `RATE_LIMIT_WINDOW_MS`    | Rate limit window in milliseconds | `900000` (15 min) | No       | `60000` (1 min)      |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window           | `100`             | No       | `50`                 |
| `CSRF_ENABLED`            | Enable CSRF protection            | `true`            | No       | `false`              |
| `HELMET_ENABLED`          | Enable security headers           | `true`            | No       | `false`              |
| `SESSION_SECRET`          | Session secret                    | (none)            | No       | `session-secret-key` |

## Monitoring & Logging

| Variable                 | Description               | Default                       | Required | Example                                 |
| ------------------------ | ------------------------- | ----------------------------- | -------- | --------------------------------------- |
| `SENTRY_DSN`             | Sentry error tracking DSN | (empty)                       | No       | `https://your-dsn@sentry.io/project-id` |
| `PROMETHEUS_ENABLED`     | Enable Prometheus metrics | `false`                       | No       | `true`                                  |
| `PROMETHEUS_PORT`        | Prometheus metrics port   | `9090`                        | No       | `9090`                                  |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password    | (none)                        | No       | `strong-password`                       |
| `LOG_FORMAT`             | Log format (json, pretty) | `json` (prod), `pretty` (dev) | No       | `json`                                  |

## File Upload

| Variable             | Description                      | Default                                          | Required | Example                              |
| -------------------- | -------------------------------- | ------------------------------------------------ | -------- | ------------------------------------ |
| `MAX_FILE_SIZE`      | Maximum file upload size (bytes) | `5242880` (5MB)                                  | No       | `10485760` (10MB)                    |
| `ALLOWED_FILE_TYPES` | Comma-separated MIME types       | `image/jpeg,image/png,image/gif,application/pdf` | No       | `image/*,application/pdf`            |
| `STORAGE_PROVIDER`   | Storage provider                 | `local`                                          | No       | `cloudinary`, `s3-compatible`        |
| `CLOUDINARY_URL`     | Cloudinary connection URL        | (empty)                                          | No       | `cloudinary://key:secret@cloud-name` |
| `S3_BUCKET`          | S3 bucket name                   | (empty)                                          | No       | `alumni-uploads`                     |
| `S3_REGION`          | S3 region                        | (empty)                                          | No       | `us-east-1`                          |
| `S3_ACCESS_KEY`      | S3 access key                    | (empty)                                          | No       | `AKIA...`                            |
| `S3_SECRET_KEY`      | S3 secret key                    | (empty)                                          | No       | `secret-key`                         |
| `S3_ENDPOINT`        | S3 endpoint (for compatible)     | (empty)                                          | No       | `https://s3.amazonaws.com`           |

## Multi-Tenancy

| Variable                   | Description                   | Default                    | Required | Example                      |
| -------------------------- | ----------------------------- | -------------------------- | -------- | ---------------------------- |
| `TENANT_COOKIE_NAME`       | Cookie name for tenant ID     | `tenant`                   | No       | `alumni-tenant`              |
| `TENANT_HEADER_NAME`       | Header name for tenant ID     | `X-Tenant-ID`              | No       | `X-Alumni-Tenant`            |
| `TENANT_SUBDOMAIN_PATTERN` | Subdomain pattern for tenants | `{subdomain}.alumni.local` | No       | `{subdomain}.example.com`    |
| `TENANT_DEFAULT_BRANDING`  | Default branding JSON         | (empty)                    | No       | `{"primaryColor":"#007bff"}` |

## Development

| Variable            | Description             | Default | Required | Example                                 |
| ------------------- | ----------------------- | ------- | -------- | --------------------------------------- |
| `DEBUG`             | Debug namespace         | (empty) | No       | `alumni:*`                              |
| `NODE_OPTIONS`      | Node.js options         | (empty) | No       | `--max-old-space-size=4096`             |
| `NODEMON_IGNORE`    | Nodemon ignore patterns | (empty) | No       | `*.test.js,coverage/`                   |
| `TEST_DATABASE_URL` | Test database URL       | (empty) | No       | `mongodb://localhost:27017/alumni-test` |
| `TEST_TIMEOUT`      | Test timeout (ms)       | `10000` | No       | `30000`                                 |

## Environment-Specific Files

The project uses the following environment files:

### Backend

- `.env` - Local development (gitignored)
- `.env.example` - Template with defaults
- `.env.test` - Test environment
- `.env.production` - Production (gitignored)

### Frontend

- `.env` - Local development (gitignored)
- `.env.example` - Template with defaults
- `.env.production` - Production build (gitignored)

### Docker Compose

- `.env.production.example` - Production Docker template
- `.env.staging.example` - Staging Docker template

## Validation Script

A validation script is available at `backend/scripts/validate-env.js` to check required environment variables.

## Required Variables by Environment

### Development

- `MONGODB_URI` (or local MongoDB running)
- `JWT_SECRET` (can be weak in development)

### Production

- `JWT_SECRET` (must be at least 32 characters)
- `MONGODB_URI` or `CENTRAL_MONGODB_URI`
- `CLIENT_URL` / `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS` (if different from CLIENT_URL)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (for email functionality)

### Testing

- `TEST_DATABASE_URL` (optional, uses MONGODB_URI with `-test` suffix)

## Best Practices

1. **Never commit sensitive values** to version control
2. **Use strong secrets** in production (min 32 characters for JWT_SECRET)
3. **Validate environment variables** on application startup
4. **Use different databases** for development, testing, and production
5. **Rotate secrets** periodically in production
6. **Use environment-specific files** (.env.production, .env.staging)
7. **Document all variables** in this reference

## Troubleshooting

If you encounter issues with environment variables:

1. Check that the `.env` file exists in the correct directory
2. Verify variable names match exactly (case-sensitive)
3. Restart the application after changing environment variables
4. Use the validation script: `node backend/scripts/validate-env.js`
5. Check for typos in variable values

## Related Documentation

- [Deployment Guide](../deploy/production/README.md)
- [Docker Configuration](../docker-compose.yml)
- [CI/CD Pipeline](../.github/workflows/ci.yml)
