/**
 * Pricing Controller
 * Business logic for pricing quotes and fare calculation
 */

const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');
const pricingRepository = require('../repositories/pricingRepository');
const { isValidCoordinates } = require('../../../shared/utils/validate');
const config = require('../../../shared/config');

/**
 * Create pricing quote
 */
async function createQuote(req, res, next) {
  try {
    const { bookingId, pickup, dropoff } = req.body;
    
    if (!bookingId || !pickup || !dropoff) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'bookingId, pickup, and dropoff are required',
        },
      });
    }
    
    const { lat: pickupLat, lng: pickupLng } = pickup;
    const { lat: dropoffLat, lng: dropoffLng } = dropoff;
    
    if (!isValidCoordinates(pickupLat, pickupLng) || !isValidCoordinates(dropoffLat, dropoffLng)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid coordinates',
        },
      });
    }
    
    // Get active pricing rule
    const rule = await pricingRepository.getActivePricingRule(config.pricing.defaultRuleId);
    
    if (!rule) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'No active pricing rule found',
        },
      });
    }
    
    // Create quote
    const result = await pricingRepository.createQuote(
      bookingId,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      rule
    );
    
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Quote created successfully',
      data: {
        quoteId: result.id,
        estimatedFare: result.total,
        currency: rule.currency,
        estimatedDuration: {
          seconds: result.estimatedDurationSeconds,
          minutes: Math.round(result.estimatedDurationSeconds / 60),
        },
        breakdown: result.breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get quote by ID
 */
async function getQuote(req, res, next) {
  try {
    const { id } = req.params;
    
    const quote = await pricingRepository.getQuoteById(id);
    
    if (!quote) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Quote not found',
        },
      });
    }
    
    res.json({
      data: {
        id: quote.id,
        bookingId: quote.booking_id,
        estimatedFare: quote.estimated_fare_amount,
        currency: quote.currency,
        estimatedDuration: {
          seconds: quote.estimated_duration_seconds,
          minutes: Math.round(quote.estimated_duration_seconds / 60),
        },
        distance: {
          rawMeters: quote.raw_distance_meters,
          adjustedMeters: quote.adjusted_distance_meters,
          adjustedKm: (quote.adjusted_distance_meters / 1000).toFixed(2),
        },
        breakdown: JSON.parse(quote.breakdown_json || '{}'),
        expiresAt: quote.expires_at,
        createdAt: quote.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create final fare (internal endpoint called by ride-service)
 */
async function createFare(req, res, next) {
  try {
    const { rideId, quoteId, actualDistanceMeters, actualDurationSeconds } = req.body;
    
    if (!rideId || !actualDistanceMeters || !actualDurationSeconds) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'rideId, actualDistanceMeters, and actualDurationSeconds are required',
        },
      });
    }
    
    // Get active pricing rule
    const rule = await pricingRepository.getActivePricingRule(config.pricing.defaultRuleId);
    
    if (!rule) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'No active pricing rule found',
        },
      });
    }
    
    // Create final fare
    const result = await pricingRepository.createFare(
      rideId,
      quoteId,
      actualDistanceMeters,
      actualDurationSeconds,
      rule
    );
    
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Fare calculated successfully',
      data: {
        fareId: result.id,
        totalAmount: result.total,
        currency: rule.currency,
        breakdown: result.breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get fare by ride ID
 */
async function getFareByRideId(req, res, next) {
  try {
    const { rideId } = req.params;
    
    const fare = await pricingRepository.getFareByRideId(rideId);
    
    if (!fare) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Fare not found',
        },
      });
    }
    
    res.json({
      data: {
        id: fare.id,
        rideId: fare.ride_id,
        totalAmount: fare.total_amount,
        currency: fare.currency,
        distance: {
          meters: fare.actual_distance_meters,
          km: (fare.actual_distance_meters / 1000).toFixed(2),
        },
        duration: {
          seconds: fare.actual_duration_seconds,
          minutes: Math.round(fare.actual_duration_seconds / 60),
        },
        breakdown: JSON.parse(fare.breakdown_json || '{}'),
        createdAt: fare.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQuote,
  getQuote,
  createFare,
  getFareByRideId,
};
