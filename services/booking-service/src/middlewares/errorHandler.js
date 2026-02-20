/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', {
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });

  // MySQL errors
  if (err.code) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Duplicate entry',
        details: err.sqlMessage
      });
    }

    if (err.code.startsWith('ER_')) {
      return res.status(500).json({
        error: 'Database error',
        code: err.code
      });
    }
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.headers['x-request-id']
  });
}

module.exports = errorHandler;
