const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
fs.ensureDirSync(logDir);

// Define log formats
const { format } = winston;
const formatConfig = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Define custom levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: formatConfig,
  defaultMeta: { service: 'api-service' },
  transports: [
    // Error logs will be stored to a separate file
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // All logs will be stored to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple(),
      format.printf(info => {
        const { timestamp, level, message, ...args } = info;
        const ts = timestamp.slice(11, 19);
        return `${ts} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
      })
    )
  }));
}

// Create a stream object with write function for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Helper function for logging HTTP requests
logger.logRequest = (req, res, next) => {
  // Skip logging health check routes if they're too noisy
  if (req.originalUrl === '/health' || req.originalUrl === '/api/health') {
    return next();
  }

  const startTime = new Date();
  
  // Once the request is processed
  res.on('finish', () => {
    const duration = new Date() - startTime;
    
    logger.http({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent') || '',
      ip: req.ip,
      userId: req.user ? req.user._id : 'unauthenticated'
    });
  });
  
  next();
};

// Helper method to log detailed error information
logger.logError = (err, req) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: req.user ? req.user._id : 'unauthenticated',
    timestamp: new Date().toISOString()
  });
};

module.exports = logger; 