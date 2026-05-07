import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (env === 'production') {
    return logLevel;
  }
  if (env === 'development') {
    return 'debug';
  }
  if (env === 'test') {
    return 'warn';
  }
  return logLevel;
};

// Define log format
const getFormat = (env) => {
  if (env === 'production') {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
  }
  
  // Development format - more human readable
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      (info) => {
        const { timestamp, level, message, ...meta } = info;
        let log = `${timestamp} ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          // Don't include stack if it's an error with stack trace
          if (meta.stack) {
            log += `\n${meta.stack}`;
            delete meta.stack;
          }
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
          }
        }
        
        return log;
      }
    )
  );
};

// Create logs directory
const logsDir = path.join(__dirname, '..', '..', 'logs');

// Create the logger
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  format: getFormat(process.env.NODE_ENV || 'development'),
  defaultMeta: { service: 'alumni-network-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Create a stream for morgan (HTTP request logging)
export const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for common logging scenarios
export const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    const user = req.user ? req.user._id : 'anonymous';
    const tenant = req.tenant ? req.tenant._id : 'unknown';
    
    logger.info('HTTP Request', {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
      ip,
      user,
      tenant,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};

export const logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    context,
    timestamp: new Date().toISOString(),
  });
};

export const logDatabase = (operation, collection, query = {}, result = {}, duration = 0) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    query: JSON.stringify(query),
    resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
    duration: `${duration}ms`,
  });
};

export const logAuth = (action, userId, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger.log(level, 'Authentication Event', {
    action,
    userId,
    success,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logEmail = (action, recipient, success, details = {}) => {
  const level = success ? 'info' : 'error';
  logger.log(level, 'Email Event', {
    action,
    recipient,
    success,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logCache = (action, key, success, details = {}) => {
  logger.debug('Cache Event', {
    action,
    key,
    success,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logSocket = (action, socketId, userId, details = {}) => {
  logger.debug('Socket Event', {
    action,
    socketId,
    userId,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

export const logTenant = (action, tenantId, details = {}) => {
  logger.info('Tenant Event', {
    action,
    tenantId,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

// Export the main logger instance
export default logger;