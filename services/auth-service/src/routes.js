/**
 * Auth Service Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController');
const { verifyToken } = require('./middlewares/auth');
const { body } = require('express-validator');
const { validateRequiredFields } = require('../../shared/utils/validate');

// Validation middleware
function validate(req, res, next) {
  const { valid, missing } = validateRequiredFields(req.body, req.requiredFields || []);
  if (!valid) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        details: { missing_fields: missing },
      },
    });
  }
  next();
}

/**
 * POST /auth/register
 * Register new user
 */
router.post('/auth/register', authController.register);

/**
 * POST /auth/login
 * Login and get tokens
 */
router.post('/auth/login', authController.login);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/auth/refresh', authController.refresh);

/**
 * GET /auth/me
 * Get current user info (requires auth)
 */
router.get('/auth/me', verifyToken, authController.me);

/**
 * POST /auth/logout
 * Logout (requires auth)
 */
router.post('/auth/logout', verifyToken, authController.logout);

module.exports = router;
