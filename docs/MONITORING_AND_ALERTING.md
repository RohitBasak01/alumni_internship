# Monitoring and Alerting Guide

## Overview

The Alumni Network Platform includes a comprehensive monitoring and alerting system built with:

- **Prometheus** for metrics collection and alerting
- **Grafana** for visualization and dashboards
- **Winston** for structured logging
- **Sentry** for error tracking and performance monitoring
- **Prometheus Alert Rules** for proactive alerting

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│   Backend API   │───▶│  Prometheus  │───▶│    Grafana   │
│   (Node.js)     │◀───│              │◀───│              │
└─────────────────┘    └──────────────┘    └──────────────┘
         │                      │                    │
         ▼                      ▼                    ▼
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│   Application   │    │   Alert      │    │   Dashboard  │
│     Logs        │    │   Rules      │    │   Views      │
└─────────────────┘    └──────────────┘    └──────────────┘
```

## Metrics Collection

### Backend Metrics

The backend exposes Prometheus metrics at `/metrics` endpoint. Key metrics include:

1. **HTTP Request Metrics**
   - `http_requests_total`: Total HTTP requests by method, route, and status code
   - `http_request_duration_seconds`: Request duration histogram
   - `http_request_size_bytes`: Request size histogram
   - `http_response_size_bytes`: Response size histogram

2. **System Metrics**
   - `process_cpu_seconds_total`: CPU usage
   - `process_resident_memory_bytes`: Memory usage (RSS)
   - `process_heap_bytes`: Heap memory usage
   - `nodejs_eventloop_lag_seconds`: Event loop lag
   - `nodejs_active_handles`: Active handles count
   - `nodejs_active_requests`: Active requests count

3. **Database Metrics**
   - `database_queries_total`: Database query count by operation and collection
   - `database_query_duration_seconds`: Query duration histogram
   - `database_connections_active`: Active database connections
   - `database_connections_idle`: Idle database connections

4. **Business Metrics**
   - `alumni_active_users`: Number of active users
   - `alumni_posts_created_total`: Total posts created
   - `alumni_events_created_total`: Total events created
   - `alumni_jobs_posted_total`: Total jobs posted
   - `alumni_mentorship_requests_total`: Total mentorship requests

### Health Checks

- `/api/health`: Comprehensive health check with database connectivity and system metrics
- `/health`: Simple health check for Docker/Kubernetes liveness probes

## Dashboard

### Grafana Dashboard

A pre-configured dashboard is available at `http://localhost:3000` (when running locally) with the following panels:

1. **System Health Overview**
   - Backend service status
   - MongoDB status

2. **Performance Metrics**
   - HTTP request rate
   - HTTP request duration (95th percentile)
   - Error rate (5xx responses)
   - Database query rate and duration
   - Event loop lag

3. **Resource Utilization**
   - Memory usage (RSS and Heap)
   - CPU usage percentage
   - Active database connections

4. **Business Metrics**
   - Active users
   - Posts created
   - Events created
   - Jobs posted

5. **API Endpoint Performance Table**
   - Request rates by endpoint
   - Response times by endpoint

### Accessing Grafana

1. Start the production stack: `docker-compose -f docker-compose.prod.yml up -d`
2. Navigate to `http://localhost:3000`
3. Login with:
   - Username: `admin`
   - Password: `admin` (change on first login, or set via `GRAFANA_ADMIN_PASSWORD`)

## Alerting

### Alert Rules

Prometheus alert rules are defined in `monitoring/alert-rules.yml`. Key alerts include:

#### Critical Alerts (severity: critical)

- **BackendDown**: Backend service is down for >1 minute
- **DatabaseDown**: MongoDB is down for >1 minute

#### Warning Alerts (severity: warning)

- **HighErrorRate**: Error rate (5xx) >5% for 2 minutes
- **HighResponseTime**: 95th percentile response time >2 seconds for 5 minutes
- **HighEventLoopLag**: Event loop lag >500ms for 2 minutes
- **HighMemoryUsage**: Memory usage >1.5GB for 5 minutes
- **HighCPUUsage**: CPU usage >80% for 5 minutes
- **HighDatabaseQueryTime**: Average query time >1 second for 5 minutes
- **ActiveUsersDrop**: No active users for 10 minutes

#### Informational Alerts (severity: info)

- **NoNewPosts**: No new posts in the last 2 hours

### Alert Configuration

Alerts are evaluated every 15 seconds (matching Prometheus evaluation interval). Each alert includes:

- **Expression**: PromQL query that triggers the alert
- **For**: Duration the condition must persist before firing
- **Labels**: Metadata for routing and processing
- **Annotations**: Human-readable information and runbook links

### Alert Management

To view and manage alerts:

1. Access Prometheus at `http://localhost:9090`
2. Navigate to "Alerts" tab
3. View alert status (pending/firing) and details

## Logging

### Structured Logging

The backend uses Winston for structured logging with the following features:

1. **Log Levels**
   - `error`: Application errors
   - `warn`: Warning conditions
   - `info`: Informational messages
   - `http`: HTTP request logging
   - `debug`: Debug information
   - `verbose`: Very detailed information

2. **Log Formats**
   - **Development**: Colored console output with timestamps
   - **Production**: JSON format for machine parsing

3. **Log Files**
   - `logs/error.log`: Error-level logs only
   - `logs/combined.log`: All logs
   - Automatic rotation (max 20MB, max 14 days)

### Log Integration

- **HTTP Requests**: Logged via Morgan middleware with Winston stream
- **Errors**: Structured error logging with context (requestId, userId, tenantId)
- **Database Queries**: Optional query logging via Mongoose debug mode
- **Audit Logs**: User actions logged to database via audit utility

## Error Tracking

### Sentry Integration

Sentry provides error tracking and performance monitoring:

1. **Error Capture**
   - Automatic capture of unhandled exceptions
   - Manual error reporting via `captureError()` utility
   - Breadcrumbs for debugging

2. **Performance Monitoring**
   - Transaction tracing for API endpoints
   - Performance metrics (p95, p99 response times)
   - User experience monitoring

3. **Configuration**
   - Set `SENTRY_DSN` environment variable
   - Configure sampling rates via `SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_PROFILES_SAMPLE_RATE`
   - Environment-specific configuration (development, staging, production)

## Deployment

### Production Monitoring Stack

The monitoring stack is included in `docker-compose.prod.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/alert-rules.yml:/etc/prometheus/alert-rules.yml:ro
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana-datasources:/etc/grafana/provisioning/datasources:ro
```

### Environment Variables

Required environment variables for monitoring:

```bash
# Prometheus/Grafana
GRAFANA_ADMIN_PASSWORD=secure_password_here

# Sentry
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io/your-project
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Backend Metrics
PROMETHEUS_ENABLED=true
LOG_LEVEL=info
```

## Troubleshooting

### Common Issues

1. **Metrics endpoint not accessible**
   - Check if `PROMETHEUS_ENABLED=true` is set
   - Verify backend is running on port 5000
   - Check Prometheus target status at `http://localhost:9090/targets`

2. **Grafana dashboard not loading**
   - Verify Grafana container is running: `docker ps | grep grafana`
   - Check datasource configuration in Grafana UI
   - Verify Prometheus is accessible from Grafana container

3. **Alerts not firing**
   - Check Prometheus alert rules at `http://localhost:9090/rules`
   - Verify alert expression matches available metrics
   - Check evaluation interval in Prometheus configuration

4. **High memory usage in logs**
   - Configure log rotation in `backend/src/utils/logger.js`
   - Set appropriate log level via `LOG_LEVEL` environment variable
   - Consider external log aggregation (ELK stack, CloudWatch, etc.)

### Monitoring Maintenance

1. **Regular Tasks**
   - Review alert thresholds quarterly
   - Update dashboard queries as metrics evolve
   - Rotate Grafana admin password periodically
   - Clean up old Prometheus data (retention: 30 days)

2. **Capacity Planning**
   - Monitor Prometheus storage usage
   - Scale monitoring stack based on application load
   - Consider external monitoring for production deployments

## Next Steps

### Advanced Monitoring

1. **Application Performance Monitoring (APM)**
   - Integrate with New Relic, Datadog, or AppDynamics
   - Add distributed tracing with OpenTelemetry

2. **User Experience Monitoring**
   - Real User Monitoring (RUM) for frontend
   - Synthetic monitoring for critical user journeys

3. **Business Intelligence**
   - Custom dashboards for business metrics
   - Integration with data warehouse for historical analysis

4. **Alert Notification Channels**
   - Integrate with Slack, PagerDuty, or email
   - Configure escalation policies for critical alerts

### References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Client for Node.js](https://github.com/siimon/prom-client)
