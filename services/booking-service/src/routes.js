const express = require('express');
const router = express.Router();
const bookingController = require('./controllers/bookingController');

// Create booking
router.post('/bookings', bookingController.createBooking);

// Get booking by ID
router.get('/bookings/:id', bookingController.getBooking);

// Get booking events (status history)
router.get('/bookings/:id/events', bookingController.getBookingEvents);

// Cancel booking
router.post('/bookings/:id/cancel', bookingController.cancelBooking);

// Driver accept booking
router.post('/bookings/:id/accept', bookingController.acceptBooking);

// Driver reject booking
router.post('/bookings/:id/reject', bookingController.rejectBooking);

// Get bookings by user ID
router.get('/bookings/user/:userId', bookingController.getBookingsByUser);

// Get bookings by driver ID
router.get('/bookings/driver/:driverId', bookingController.getBookingsByDriver);

module.exports = router;
