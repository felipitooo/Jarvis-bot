class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(message, details = null) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

class PermissionDeniedError extends AppError {
  constructor(message = 'Permission denied', details = null) {
    super(message, 'PERMISSION_DENIED', 403, details);
  }
}

/**
 * Attaches process-level error listeners to ensure crashes are logged and handled gracefully.
 * @param {import('./logger').Logger} logger
 * @param {Function} [shutdownCallback]
 */
function setupGlobalErrorHandlers(logger, shutdownCallback) {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception detected!', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });

    if (typeof shutdownCallback === 'function') {
      try {
        shutdownCallback('uncaughtException');
      } catch (shutdownErr) {
        process.stderr.write(`Error during emergency shutdown: ${shutdownErr.message}\n`);
      }
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection detected!', {
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack
      } : reason
    });
  });
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  PermissionDeniedError,
  setupGlobalErrorHandlers
};
