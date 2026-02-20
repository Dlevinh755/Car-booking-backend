/**
 * Request ID Middleware
 */

const { generateRequestId } = require('../../../shared/utils/http');

function requestIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('x-request-id', req.requestId);
  next();
}

module.exports = requestIdMiddleware;
