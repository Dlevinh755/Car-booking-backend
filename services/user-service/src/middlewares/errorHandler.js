/**
 * Error Handler Middleware
 */

const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');

function errorHandler(err, req, res, next) {
  console.error(`[${req.requestId}] Error:`, err);
  
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(HTTP_STATUS.CONFLICT).json({
      error: {
        code: ERROR_CODES.DUPLICATE_ERROR,
        message: 'Duplicate entry',
        details: err.sqlMessage,
      },
    });
  }
  
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Database error',
        details: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined,
      },
    });
  }
  
  const statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: {
      code: err.code || ERROR_CODES.INTERNAL_ERROR,
      message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}

module.exports = errorHandler;
