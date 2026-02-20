const { generateUUID } = require('../../../../shared/utils/uuid');

/**
 * Request ID middleware
 * Generates or uses existing request ID for tracking
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = requestIdMiddleware;
