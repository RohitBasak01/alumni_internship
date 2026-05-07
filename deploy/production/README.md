# Production Deployment Guide

This document describes how to deploy the Alumni Network Platform to a production environment.

## Overview

The production environment is the live system serving real users. This guide covers deployment strategies, monitoring, backup procedures, and disaster recovery.

## Prerequisites

### Infrastructure Requirements

1. **Server/VPS/Cloud Provider** with:
   - Minimum 4GB RAM, 2 CPU cores
   - 50GB storage (SSD recommended)
   - Ubuntu 22.04 LTS or similar

2. **Domain names** configured:
   - Primary domain: `alumni-network.example.com`
   - API subdomain: `api.alumni-network.example.com`
   - Optional: `www.alumni-network.example.com`

3. **SSL certificates** (automatically managed via Traefik with Let's Encrypt)

4. **Backup storage** (AWS S3, Google Cloud Storage, or local NAS)

5. **Monitoring tools** (Prometheus, Grafana, Sentry)

## Deployment Architecture

### Option 1: Docker Compose (Single Server)

Recommended for small to medium deployments.

```
┌─────────────────────────────────────────────────┐
│                 Production Server                │
├─────────────┬─────────────┬─────────────────────┤
│   Traefik   │  MongoDB    │   Backup Service    │
│   (Proxy)   │  (Database) │                     │
├─────────────┼─────────────┼─────────────────────┤
│   Backend   │  Frontend   │   Monitoring Stack  │
│   (API)     │  (React)    │  (Prometheus+Grafana)│
└─────────────┴─────────────┴─────────────────────┘
```

### Option 2: Kubernetes (Multi-Server)

For large-scale, high-availability deployments.

## Quick Deployment (Docker Compose)

### 1. Prepare the server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clone deployment configuration

```bash
git clone https://github.com/your-org/alumni-internship.git
cd alumni-internship/deploy/production
```

### 3. Configure environment

```bash
# Copy and edit environment file
cp .env.production.example .env.production
nano .env.production
```

### 4. Initialize directories

```bash
mkdir -p data/mongodb data/prometheus data/grafana logs backups
chmod -R 755 data logs backups
```

### 5. Deploy the application

```bash
# Start all services
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 6. Verify deployment

```bash
# Test backend
curl https://api.alumni-network.example.com/health

# Test frontend
curl https://alumni-network.example.com/health

# Test SSL
curl -I https://alumni-network.example.com
```

## Environment Configuration

### Required environment variables (.env.production)

```bash
# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=very-strong-password-here

# JWT
JWT_SECRET=very-long-random-jwt-secret-minimum-32-characters

# Application URLs
CLIENT_URL=https://alumni-network.example.com
FRONTEND_URL=https://alumni-network.example.com
CORS_ALLOWED_ORIGINS=https://alumni-network.example.com,https://www.alumni-network.example.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@alumni-network.example.com

# Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/your-project-id
SENTRY_ENVIRONMENT=production

# Monitoring
GRAFANA_ADMIN_PASSWORD=strong-grafana-password

# Backup
BACKUP_ENCRYPTION_KEY=encryption-key-for-backups
AWS_ACCESS_KEY_ID=your-aws-key  # If using S3 backups
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

## Database Management

### Backup Strategy

#### Automated daily backups

The production setup includes a backup service that:

1. Creates daily MongoDB dump at 2:00 AM UTC
2. Compresses and encrypts the backup
3. Uploads to configured cloud storage (S3, GCS, or local)
4. Retains backups for 30 days

#### Manual backup

```bash
# Create immediate backup
docker exec alumni-mongodb-prod mongodump \
  --username=$MONGO_ROOT_USER \
  --password=$MONGO_ROOT_PASSWORD \
  --authenticationDatabase=admin \
  --db=alumni-network \
  --out=/backup/$(date +%Y%m%d-%H%M%S)

# Download backup
docker cp alumni-mongodb-prod:/backup/20250101-020000 ./backups/
```

#### Restore from backup

```bash
# Stop application
docker-compose -f docker-compose.production.yml stop backend frontend

# Restore database
docker exec -i alumni-mongodb-prod mongorestore \
  --username=$MONGO_ROOT_USER \
  --password=$MONGO_ROOT_PASSWORD \
  --authenticationDatabase=admin \
  --db=alumni-network \
  --drop \
  /backup/20250101-020000/alumni-network

# Start application
docker-compose -f docker-compose.production.yml start backend frontend
```

## Monitoring & Alerting

### Access monitoring tools

- **Grafana Dashboard**: `https://alumni-network.example.com:3000`
  - Default credentials: admin / (password from GRAFANA_ADMIN_PASSWORD)
- **Prometheus**: `https://alumni-network.example.com:9090`
- **Backend Metrics**: `https://api.alumni-network.example.com/metrics`

### Key metrics to monitor

1. **Application Health**
   - API response time (< 500ms)
   - Error rate (< 1%)
   - Database connection status

2. **System Resources**
   - CPU usage (< 80%)
   - Memory usage (< 85%)
   - Disk space (> 20% free)

3. **Business Metrics**
   - Active users
   - New registrations
   - Engagement metrics

### Alerting Configuration

Alerts are configured in Prometheus and sent to:

1. **Email** - For critical system alerts
2. **Slack** - For team notifications
3. **PagerDuty** - For on-call emergencies

## Scaling

### Vertical Scaling (Increase resources)

1. **Increase Docker resources**:

   ```yaml
   # In docker-compose.production.yml
   backend:
     deploy:
       resources:
         limits:
           cpus: "2"
           memory: 2G
   ```

2. **Database optimization**:
   - Add MongoDB indexes
   - Enable query caching
   - Implement connection pooling

### Horizontal Scaling (Add more instances)

For high-traffic scenarios:

1. **Load balancing**: Add Traefik load balancer
2. **Database replication**: Set up MongoDB replica set
3. **Multiple backend instances**: Scale backend service

## Security Hardening

### Essential security measures

1. **Firewall configuration**:

   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

2. **Regular updates**:

   ```bash
   # Update system weekly
   sudo apt update && sudo apt upgrade -y
   docker-compose -f docker-compose.production.yml pull
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Security scanning**:
   ```bash
   # Scan Docker images weekly
   docker scan alumni-backend:latest
   docker scan alumni-frontend:latest
   ```

## Disaster Recovery

### Recovery procedures

1. **Database corruption**:
   - Restore from latest backup
   - Switch to standby database if available

2. **Application failure**:
   - Restart containers: `docker-compose -f docker-compose.production.yml restart`
   - Rollback to previous version if needed

3. **Server failure**:
   - Spin up new server from infrastructure-as-code templates
   - Restore from backups
   - Update DNS records

### Recovery Time Objective (RTO): 2 hours

### Recovery Point Objective (RPO): 24 hours

## Maintenance

### Regular maintenance tasks

1. **Daily**:
   - Check application logs for errors
   - Verify backup completion
   - Monitor system resources

2. **Weekly**:
   - Update Docker images
   - Review security logs
   - Clean up old backups (> 30 days)

3. **Monthly**:
   - Review and update dependencies
   - Security audit
   - Performance optimization

## Troubleshooting

### Common issues and solutions

1. **Containers won't start**:

   ```bash
   # Check logs
   docker-compose -f docker-compose.production.yml logs

   # Check disk space
   df -h

   # Check memory
   free -h
   ```

2. **Database connection issues**:

   ```bash
   # Test MongoDB connection
   docker exec alumni-mongodb-prod mongosh --eval "db.adminCommand('ping')"

   # Check MongoDB logs
   docker logs alumni-mongodb-prod
   ```

3. **SSL certificate issues**:

   ```bash
   # Check Traefik logs
   docker logs alumni-traefik-prod

   # Verify DNS configuration
   dig alumni-network.example.com
   ```

### Support

For production issues:

1. Check monitoring dashboards first
2. Review application logs
3. Contact DevOps team if unresolved

## Next Steps After Deployment

1. **Load testing** - Simulate expected user traffic
2. **Security audit** - Conduct penetration testing
3. **Documentation** - Update runbooks and procedures
4. **Training** - Train support team on monitoring and troubleshooting
