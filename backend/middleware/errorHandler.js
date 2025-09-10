// backend/middleware/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}]`, err);

  const statusCode = err.statusCode || 500;
  const payload = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message: err.message || 'Internal server error'
  };

  // Provide stack trace in development
  if (process.env.NODE_ENV === 'development') payload.stack = err.stack;

  res.status(statusCode).json(payload);
};

module.exports = { AppError, globalErrorHandler };
