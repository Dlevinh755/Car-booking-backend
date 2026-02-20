/**
 * Pricing Service Routes
 */

const express = require('express');
const router = express.Router();
const pricingController = require('./controllers/pricingController');

/**
 * POST /pricing/quotes
 * Create pricing quote
 */
router.post('/pricing/quotes', pricingController.createQuote);

/**
 * GET /pricing/quotes/:id
 * Get quote by ID
 */
router.get('/pricing/quotes/:id', pricingController.getQuote);

/**
 * POST /pricing/fares
 * Create final fare (internal endpoint)
 */
router.post('/pricing/fares', pricingController.createFare);

/**
 * GET /pricing/fares/ride/:rideId
 * Get fare by ride ID
 */
router.get('/pricing/fares/ride/:rideId', pricingController.getFareByRideId);

module.exports = router;
