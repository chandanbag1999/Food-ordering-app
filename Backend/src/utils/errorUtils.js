/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Used to distinguish operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler to remove try-catch blocks from route handlers
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Format the error response object
 */
const formatErrorResponse = (err, includeStack = false) => {
  const response = {
    success: false,
    message: err.message || 'Something went wrong',
    ...(err.errorCode && { errorCode: err.errorCode }),
  };

  // Include stack trace in development environment
  if (includeStack && process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return response;
};

/**
 * Common error types for consistent error handling
 */
const ErrorTypes = {
  BAD_REQUEST: {
    statusCode: 400,
    defaultMessage: 'Invalid request data',
  },
  UNAUTHORIZED: {
    statusCode: 401,
    defaultMessage: 'Authentication required',
  },
  FORBIDDEN: {
    statusCode: 403,
    defaultMessage: 'Access denied',
  },
  NOT_FOUND: {
    statusCode: 404,
    defaultMessage: 'Resource not found',
  },
  CONFLICT: {
    statusCode: 409,
    defaultMessage: 'Resource conflict',
  },
  VALIDATION_ERROR: {
    statusCode: 422,
    defaultMessage: 'Validation failed',
  },
  INTERNAL_SERVER: {
    statusCode: 500,
    defaultMessage: 'Internal server error',
  },
};

/**
 * Create error by type
 */
const createError = (type, message = null, errorCode = null) => {
  const errorMessage = message || type.defaultMessage;
  return new AppError(errorMessage, type.statusCode, errorCode);
};

module.exports = {
  AppError,
  asyncHandler,
  formatErrorResponse,
  ErrorTypes,
  createError,
}; 