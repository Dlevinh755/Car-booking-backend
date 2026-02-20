/**
 * Auth Middleware
 * JWT token verification
 */

const jwt = require('jsonwebtoken');
const config = require('../../../shared/config');
const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');

/**
 * Verify JWT token middleware
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        message: 'No token provided',
      },
    });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.TOKEN_EXPIRED,
          message: 'Token has expired',
        },
      });
    }
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: {
        code: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid token',
      },
    });
  }
}

/**
 * Optional auth - doesn't fail if no token
 */
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

/**
 * Check if user has specific role
 */
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.AUTHENTICATION_ERROR,
          message: 'Authentication required',
        },
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          code: ERROR_CODES.AUTHORIZATION_ERROR,
          message: 'Insufficient permissions',
        },
      });
    }
    
    next();
  };
}

module.exports = {
  verifyToken,
  optionalAuth,
  checkRole,
};
