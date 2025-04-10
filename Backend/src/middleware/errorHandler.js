/*
  Enhanced error response handler using standardized error utilities
*/ 
const { formatErrorResponse, AppError, ErrorTypes } = require('../utils/errorUtils');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode;

  // Log error for server-side debugging
  console.error('Error:', {
    message: err.message,
    name: err.name,
    statusCode: err.statusCode || 500,
    path: req.originalUrl,
    method: req.method,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, 'INVALID_ID');
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error message
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    
    error = new AppError(message, 400, 'DUPLICATE_VALUE');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  // Express-validator errors
  if (err.array && typeof err.array === 'function') {
    const message = err.array({ onlyFirstError: true })[0].msg;
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File size exceeds limit', 400, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected field', 400, 'INVALID_FIELD');
  }

  // Format the error response
  const errorResponse = formatErrorResponse(
    {
      message: error.message || 'Server Error',
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode,
      stack: err.stack
    },
    true // Include stack trace in development mode
  );

  // Send error response
  res.status(error.statusCode || 500).json(errorResponse);
};

module.exports = errorHandler;
