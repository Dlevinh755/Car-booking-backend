/**
 * Driver Service Routes
 */

const express = require('express');
const router = express.Router();
const driverController = require('./controllers/driverController');
const { optionalAuth } = require('./middlewares/auth');

/**
 * POST /drivers/register
 * Register as driver
 */
router.post('/drivers/register', driverController.register);

/**
 * POST /drivers/presence
 * Update driver online status and location
 */
router.post('/drivers/presence', optionalAuth, driverController.updatePresence);

/**
 * GET /drivers/nearby
 * Find nearby online drivers (must come before /drivers/:id)
 */
router.get('/drivers/nearby', driverController.findNearby);

/**
 * GET /drivers/user/:userId
 * Get driver by user ID
 */
router.get('/drivers/user/:userId', driverController.getDriverByUserId);

/**
 * GET /drivers/:id
 * Get driver by ID
 */
router.get('/drivers/:id', driverController.getDriverById);

module.exports = router;
