/**
 * User Service Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('./controllers/userController');
const { verifyToken } = require('./middlewares/auth');

/**
 * POST /users/internal
 * Create user (internal endpoint for auth-service)
 */
router.post('/users/internal', userController.createUserInternal);

/**
 * GET /users/me
 * Get current user profile
 */
router.get('/users/me', verifyToken, userController.getMe);

/**
 * PATCH /users/me
 * Update current user profile
 */
router.patch('/users/me', verifyToken, userController.updateMe);

/**
 * GET /users/:id
 * Get user by ID
 */
router.get('/users/:id', userController.getUserById);

module.exports = router;
