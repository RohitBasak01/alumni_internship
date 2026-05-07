/**
 * Prometheus metrics collection and monitoring utility.
 * Provides system metrics, application metrics, and custom business metrics.
 */

import client from 'prom-client';
import logger from './logger.js';

// Create a Registry for custom metrics
const register = new client.Registry();
register.setDefaultLabels({
  app: 'alumni-network',
  version: process.env.npm_package_version || '1.0.0',
});

// Enable default metrics (CPU, memory, event loop, etc.) and register them
client.collectDefaultMetrics({
  register,
  prefix: 'alumni_network_',
  timeout: 10000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // GC duration histogram buckets
});

// HTTP request metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant'],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // buckets in seconds
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant'],
});

const httpRequestErrorsTotal = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors (4xx, 5xx)',
  labelNames: ['method', 'route', 'status_code', 'tenant'],
});

// Database metrics
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['collection', 'operation', 'tenant'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const dbQueryErrorsTotal = new client.Counter({
  name: 'db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['collection', 'operation', 'tenant'],
});

// Business metrics
const activeUsersGauge = new client.Gauge({
  name: 'active_users_total',
  help: 'Number of active users in the system',
  labelNames: ['tenant'],
});

const tenantCountGauge = new client.Gauge({
  name: 'tenants_total',
  help: 'Number of active tenants',
});

const apiEndpointCallsTotal = new client.Counter({
  name: 'api_endpoint_calls_total',
  help: 'Total calls to specific API endpoints',
  labelNames: ['endpoint', 'method', 'tenant'],
});

// System metrics (already covered by default metrics, but adding some custom ones)
const memoryUsageGauge = new client.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Memory usage of the process in bytes',
  labelNames: ['type'], // heapUsed, heapTotal, rss, external
});

const eventLoopLagGauge = new client.Gauge({
  name: 'event_loop_lag_seconds',
  help: 'Event loop lag in seconds',
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestErrorsTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueryErrorsTotal);
register.registerMetric(activeUsersGauge);
register.registerMetric(tenantCountGauge);
register.registerMetric(apiEndpointCallsTotal);
register.registerMetric(memoryUsageGauge);
register.registerMetric(eventLoopLagGauge);

/**
 * Start metrics collection and periodic updates.
 */
export function startMetricsCollection() {
  // Update memory usage periodically
  setInterval(() => {
    const memory = process.memoryUsage();
    memoryUsageGauge.set({ type: 'heapUsed' }, memory.heapUsed);
    memoryUsageGauge.set({ type: 'heapTotal' }, memory.heapTotal);
    memoryUsageGauge.set({ type: 'rss' }, memory.rss);
    memoryUsageGauge.set({ type: 'external' }, memory.external);
  }, 15000); // Every 15 seconds

  // Update event loop lag
  setInterval(() => {
    const start = process.hrtime.bigint();
    setTimeout(() => {
      const end = process.hrtime.bigint();
      const lag = Number(end - start) / 1e9 - 0.01; // Convert nanoseconds to seconds, subtract expected 10ms
      eventLoopLagGauge.set(lag);
    }, 10);
  }, 10000); // Every 10 seconds

  logger.info('Metrics collection started', {
    defaultMetrics: true,
    customMetrics: [
      'http_request_duration_seconds',
      'http_requests_total',
      'db_query_duration_seconds',
      'active_users_total',
      'tenants_total',
    ],
  });
}

/**
 * Record HTTP request metrics.
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {string} options.route - Request route
 * @param {number} options.statusCode - HTTP status code
 * @param {number} options.durationMs - Request duration in milliseconds
 * @param {string} options.tenantId - Tenant ID (optional)
 */
export function recordHttpRequest({ method, route, statusCode, durationMs, tenantId = 'unknown' }) {
  const durationSeconds = durationMs / 1000;
  const labels = {
    method,
    route: normalizeRoute(route),
    status_code: statusCode,
    tenant: tenantId,
  };

  httpRequestDurationMicroseconds.observe(labels, durationSeconds);
  httpRequestsTotal.inc(labels);

  if (statusCode >= 400) {
    httpRequestErrorsTotal.inc(labels);
  }
}

/**
 * Record database query metrics.
 * @param {Object} options - Query options
 * @param {string} options.collection - MongoDB collection name
 * @param {string} options.operation - Operation type (find, insert, update, delete, aggregate)
 * @param {number} options.durationMs - Query duration in milliseconds
 * @param {boolean} options.error - Whether the query resulted in an error
 * @param {string} options.tenantId - Tenant ID (optional)
 */
export function recordDbQuery({ collection, operation, durationMs, error = false, tenantId = 'unknown' }) {
  const durationSeconds = durationMs / 1000;
  const labels = {
    collection,
    operation,
    tenant: tenantId,
  };

  dbQueryDuration.observe(labels, durationSeconds);

  if (error) {
    dbQueryErrorsTotal.inc(labels);
  }
}

/**
 * Update active users gauge.
 * @param {number} count - Number of active users
 * @param {string} tenantId - Tenant ID (optional)
 */
export function updateActiveUsers(count, tenantId = 'global') {
  activeUsersGauge.set({ tenant: tenantId }, count);
}

/**
 * Update tenant count gauge.
 * @param {number} count - Number of active tenants
 */
export function updateTenantCount(count) {
  tenantCountGauge.set(count);
}

/**
 * Record API endpoint call.
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method
 * @param {string} tenantId - Tenant ID (optional)
 */
export function recordApiEndpointCall(endpoint, method = 'GET', tenantId = 'unknown') {
  apiEndpointCallsTotal.inc({ endpoint: normalizeRoute(endpoint), method, tenant: tenantId });
}

/**
 * Get metrics as a string for Prometheus scraping.
 * @returns {Promise<string>} Prometheus metrics in text format
 */
export async function getMetrics() {
  return register.metrics();
}

/**
 * Get metrics registry for direct access.
 * @returns {client.Registry} Prometheus registry
 */
export function getRegistry() {
  return register;
}

/**
 * Normalize route path for metrics (remove IDs, etc.)
 * @param {string} route - Original route path
 * @returns {string} Normalized route
 */
function normalizeRoute(route) {
  if (!route) return 'unknown';
  
  // Remove UUIDs, MongoDB IDs, numeric IDs
  let normalized = route
    .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectId
    .replace(/\/[0-9]+/g, '/:id') // Numeric IDs
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '/:uuid') // UUIDs
    .replace(/\?.*$/, ''); // Remove query parameters
  
  // Limit length
  if (normalized.length > 200) {
    normalized = normalized.substring(0, 200) + '...';
  }
  
  return normalized || 'unknown';
}

/**
 * Create middleware for Express to automatically record HTTP metrics.
 * @returns {Function} Express middleware
 */
export function metricsMiddleware() {
  return (req, res, next) => {
    const start = Date.now();
    const tenantId = req.tenant?._id || req.headers['x-tenant-id'] || 'unknown';
    
    // Record response finish
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      recordHttpRequest({
        method: req.method,
        route: req.route?.path || req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
        tenantId,
      });
      
      // Also record API endpoint call for business metrics
      if (req.route?.path) {
        recordApiEndpointCall(req.route.path, req.method, tenantId);
      }
    });
    
    next();
  };
}

export default {
  startMetricsCollection,
  recordHttpRequest,
  recordDbQuery,
  updateActiveUsers,
  updateTenantCount,
  recordApiEndpointCall,
  getMetrics,
  getRegistry,
  metricsMiddleware,
  client,
};