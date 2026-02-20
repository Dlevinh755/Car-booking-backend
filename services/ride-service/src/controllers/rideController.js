const rideRepository = require('../repositories/rideRepository');
const { isValidCoordinates } = require('../../../../shared/utils/validate');
const http = require('../../../../shared/utils/http');
const config = require('../../../../shared/config');

/**
 * Create a new ride (internal endpoint for booking-service)
 */
async function createRide(req, res, next) {
  try {
    const { bookingId, userId, driverId, pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;

    // Validate required fields
    if (!bookingId || !userId || !driverId) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: { bookingId, userId, driverId }
      });
    }

    // Validate coordinates
    if (!isValidCoordinates(pickupLat, pickupLng)) {
      return res.status(400).json({
        error: 'Invalid pickup coordinates',
        details: { pickupLat, pickupLng }
      });
    }

    if (!isValidCoordinates(dropoffLat, dropoffLng)) {
      return res.status(400).json({
        error: 'Invalid dropoff coordinates',
        details: { dropoffLat, dropoffLng }
      });
    }

    const ride = await rideRepository.createRide({
      bookingId,
      userId,
      driverId,
      pickupLat: parseFloat(pickupLat),
      pickupLng: parseFloat(pickupLng),
      dropoffLat: parseFloat(dropoffLat),
      dropoffLng: parseFloat(dropoffLng)
    });

    res.status(201).json({
      message: 'Ride created successfully',
      ride
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get ride by ID
 */
async function getRide(req, res, next) {
  try {
    const { id } = req.params;

    const ride = await rideRepository.getRideById(id);

    if (!ride) {
      return res.status(404).json({
        error: 'Ride not found'
      });
    }

    res.json({
      ride
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get ride events (status history)
 */
async function getRideEvents(req, res, next) {
  try {
    const { id } = req.params;

    // Check if ride exists
    const ride = await rideRepository.getRideById(id);
    if (!ride) {
      return res.status(404).json({
        error: 'Ride not found'
      });
    }

    const events = await rideRepository.getStatusEvents(id);

    res.json({
      rideId: id,
      events
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update ride status
 */
async function updateRideStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, lat, lng } = req.body;

    // Validate status
    const validStatuses = ['created', 'arrived', 'picked_up', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    // Validate coordinates if provided
    if (lat !== undefined && lng !== undefined) {
      if (!isValidCoordinates(lat, lng)) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          details: { lat, lng }
        });
      }
    }

    // Get current ride
    const currentRide = await rideRepository.getRideById(id);
    if (!currentRide) {
      return res.status(404).json({
        error: 'Ride not found'
      });
    }

    // Update status
    let ride = await rideRepository.updateRideStatus(
      id,
      status,
      lat !== undefined ? parseFloat(lat) : null,
      lng !== undefined ? parseFloat(lng) : null
    );

    // If status is 'completed', calculate final fare
    if (status === 'completed') {
      try {
        // Calculate actual distance and duration
        const distanceMeters = await rideRepository.calculateRideDistance(id);
        const durationSeconds = await rideRepository.calculateRideDuration(id);

        // Call pricing service to create final fare
        const pricingServiceUrl = config.get('PRICING_SERVICE_URL') || 'http://pricing-service:3007';
        
        const fareResponse = await http.post(`${pricingServiceUrl}/pricing/fares`, {
          rideId: id,
          pickupLat: currentRide.pickupLat,
          pickupLng: currentRide.pickupLng,
          dropoffLat: currentRide.dropoffLat,
          dropoffLng: currentRide.dropoffLng,
          distanceMeters,
          durationSeconds
        }, {
          headers: {
            'x-request-id': req.headers['x-request-id']
          }
        });

        const fare = fareResponse.data.fare;

        // Update ride with fare information
        ride = await rideRepository.updateRideFare(
          id,
          distanceMeters,
          durationSeconds,
          fare.totalAmount,
          fare.id
        );

        console.log(`✓ Ride ${id} completed. Distance: ${distanceMeters}m, Duration: ${durationSeconds}s, Fare: ${fare.totalAmount} VND`);
      } catch (fareError) {
        console.error('Failed to create fare for completed ride:', fareError);
        // Don't fail the status update if fare creation fails
        // The fare can be calculated later
      }
    }

    res.json({
      message: 'Ride status updated successfully',
      ride
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get rides by user ID
 */
async function getRidesByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const rides = await rideRepository.getRidesByUserId(userId, limit, offset);

    res.json({
      userId,
      rides,
      limit,
      offset,
      count: rides.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get rides by driver ID
 */
async function getRidesByDriver(req, res, next) {
  try {
    const { driverId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const rides = await rideRepository.getRidesByDriverId(driverId, limit, offset);

    res.json({
      driverId,
      rides,
      limit,
      offset,
      count: rides.length
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRide,
  getRide,
  getRideEvents,
  updateRideStatus,
  getRidesByUser,
  getRidesByDriver
};
