const express = require('express');
const router = express.Router();
const rideController = require('./controllers/rideController');

// Create ride (internal endpoint for booking-service)
router.post('/rides', rideController.createRide);

// Get ride by ID
router.get('/rides/:id', rideController.getRide);

// Get ride events (status history)
router.get('/rides/:id/events', rideController.getRideEvents);

// Update ride status
router.post('/rides/:id/status', rideController.updateRideStatus);

// Get rides by user ID
router.get('/rides/user/:userId', rideController.getRidesByUser);

// Get rides by driver ID
router.get('/rides/driver/:driverId', rideController.getRidesByDriver);

module.exports = router;
