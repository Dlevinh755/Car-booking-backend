/**
 * Auth Middleware for Driver Service
 */

const jwt = require('jsonwebtoken');
const config = require('../../../shared/config');
const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
  } catch (error) {
    // Ignore token errors for optional auth
  }
  
  next();
}

module.exports = {
  optionalAuth,
};
