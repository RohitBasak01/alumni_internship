# Staging Environment Deployment Guide

This document describes how to set up and deploy the Alumni Network Platform to a staging environment.

## Overview

The staging environment is a pre-production environment used for testing new features, integration testing, and quality assurance before deploying to production.

## Prerequisites

1. **Docker & Docker Compose** installed on the staging server
2. **Domain names** configured for staging (e.g., `staging.alumni-network.example.com`, `api.staging.alumni-network.example.com`)
3. **SSL certificates** (can be auto-generated with Let's Encrypt via Traefik)
4. **Environment variables** configured (see `.env.staging.example`)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/alumni-internship.git
cd alumni-internship/deploy/staging
```

### 2. Configure environment variables

```bash
cp .env.staging.example .env.staging
# Edit .env.staging with your staging configuration
```

### 3. Start the staging environment

```bash
docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
```

### 4. Verify deployment

```bash
# Check all services are running
docker-compose -f docker-compose.staging.yml ps

# Test backend health
curl https://api.staging.alumni-network.example.com/health

# Test frontend health
curl https://staging.alumni-network.example.com/health
```

## Environment Configuration

Create a `.env.staging` file with the following variables:

```bash
# MongoDB
MONGO_ROOT_USER=staging_admin
MONGO_ROOT_PASSWORD=secure-staging-password

# JWT
JWT_SECRET=your-staging-jwt-secret

# URLs
CLIENT_URL=https://staging.alumni-network.example.com
FRONTEND_URL=https://staging.alumni-network.example.com
CORS_ALLOWED_ORIGINS=https://staging.alumni-network.example.com

# Docker images
DOCKER_USERNAME=your-docker-username
TAG=latest  # or specific git commit SHA

# Monitoring
GRAFANA_ADMIN_PASSWORD=staging-grafana-password

# Sentry (optional)
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/your-project-id
SENTRY_ENVIRONMENT=staging
```

## Architecture

The staging environment consists of:

1. **MongoDB** - Database for staging data
2. **Backend API** - Node.js/Express application
3. **Frontend** - React application served via Nginx
4. **Traefik** - Reverse proxy with automatic SSL
5. **Prometheus** - Metrics collection
6. **Grafana** - Monitoring dashboard

## Monitoring & Observability

Access monitoring tools:

- **Grafana Dashboard**: `https://staging.alumni-network.example.com:3000`
  - Default credentials: admin / (password from GRAFANA_ADMIN_PASSWORD)
- **Prometheus**: `https://staging.alumni-network.example.com:9090`
- **Backend Metrics**: `https://api.staging.alumni-network.example.com/metrics`

## Database Management

### Backup staging database

```bash
docker exec alumni-mongodb-staging mongodump \
  --username=staging_admin \
  --password=secure-staging-password \
  --authenticationDatabase=admin \
  --db=alumni-staging \
  --out=/backup/$(date +%Y%m%d)

# Copy backup from container
docker cp alumni-mongodb-staging:/backup/20250101 ./backups/
```

### Restore to staging database

```bash
docker exec -i alumni-mongodb-staging mongorestore \
  --username=staging_admin \
  --password=secure-staging-password \
  --authenticationDatabase=admin \
  --db=alumni-staging \
  --drop \
  /backup/20250101/alumni-staging
```

## Deployment Automation

The staging environment can be automatically deployed via GitHub Actions when code is pushed to the `develop` branch.

### Manual deployment from CI/CD

```bash
# Pull latest images
docker-compose -f docker-compose.staging.yml pull

# Recreate containers with new images
docker-compose -f docker-compose.staging.yml up -d --force-recreate
```

## Testing in Staging

### Run integration tests against staging

```bash
cd backend
npm test -- --testPathPattern="integration" --testTimeout=15000
```

### Load testing

```bash
# Using k6 (install from https://k6.io)
k6 run --vus 10 --duration 30s tests/load-test.js
```

## Troubleshooting

### Common issues

1. **Containers not starting**: Check logs with `docker-compose -f docker-compose.staging.yml logs`
2. **Database connection errors**: Verify MongoDB is running and credentials are correct
3. **SSL certificate issues**: Check Traefik logs and ensure domain DNS is properly configured
4. **Memory issues**: Adjust resource limits in docker-compose.staging.yml

### View logs

```bash
# All services
docker-compose -f docker-compose.staging.yml logs -f

# Specific service
docker-compose -f docker-compose.staging.yml logs -f backend
```

## Cleanup

To stop and remove all staging containers:

```bash
docker-compose -f docker-compose.staging.yml down -v
```

To remove all data (including database):

```bash
docker-compose -f docker-compose.staging.yml down -v --rmi all
```

## Next Steps

After successful testing in staging:

1. Create a release tag
2. Run final security scans
3. Deploy to production using the production deployment guide
