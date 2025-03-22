/*
  Error response handler
  Error object
  Express request object
  Express response object
  Express next function
*/ 

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for server-side debugging
  console.error(err.stack.red);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new Error(message);
  };
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error message
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new Error(message);
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new Error(message);
    error.statusCode = 401;
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  
};

module.exports = errorHandler;
