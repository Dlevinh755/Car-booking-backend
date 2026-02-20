/**
 * Auth Middleware for User Service
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
  
  const token = authHeader.substring(7);
  
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

module.exports = {
  verifyToken,
};
