const bookingRepository = require('../repositories/bookingRepository');
const { isValidCoordinates } = require('../../../../shared/utils/validate');
const http = require('../../../../shared/utils/http');

/**
 * Create a new booking
 * This is the main orchestration endpoint that:
 * 1. Creates the booking
 * 2. Gets pricing quote
 * 3. Searches for nearby drivers
 * 4. Assigns a driver
 * 5. Creates the ride
 */
async function createBooking(req, res, next) {
  try {
    console.log('📥 Received booking request:', req.body);
    
    const { userId, pickupLat, pickupLng, dropoffLat, dropoffLng, note } = req.body;

    // Validate required fields
    if (!userId) {
      console.log('❌ Validation failed: Missing userId');
      return res.status(400).json({
        error: 'Missing required field: userId'
      });
    }

    // Validate coordinates
    if (!isValidCoordinates(pickupLat, pickupLng)) {
      console.log('❌ Validation failed: Invalid pickup coordinates', { pickupLat, pickupLng });
      return res.status(400).json({
        error: 'Invalid pickup coordinates',
        details: { pickupLat, pickupLng }
      });
    }

    if (!isValidCoordinates(dropoffLat, dropoffLng)) {
      console.log('❌ Validation failed: Invalid dropoff coordinates', { dropoffLat, dropoffLng });
      return res.status(400).json({
        error: 'Invalid dropoff coordinates',
        details: { dropoffLat, dropoffLng }
      });
    }

    // Step 1: Create booking with status='requested'
    let booking = await bookingRepository.createBooking({
      userId,
      pickupLat: parseFloat(pickupLat),
      pickupLng: parseFloat(pickupLng),
      dropoffLat: parseFloat(dropoffLat),
      dropoffLng: parseFloat(dropoffLng),
      note
    });

    console.log(`✓ Booking ${booking.id} created with status='requested'`);

    // Step 2: Find nearby online drivers
    let assignedDriver = null;
    try {
      const driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3005';
      console.log(`🔍 Searching for nearby drivers around (${booking.pickupLat}, ${booking.pickupLng})...`);
      
      const driversResponse = await http.get(`${driverServiceUrl}/drivers/nearby`, {
        params: {
          lat: booking.pickupLat,
          lng: booking.pickupLng,
          radiusKm: 10, // 10km radius
          limit: 1 // Get closest driver only
        },
        headers: {
          'x-request-id': req.headers['x-request-id']
        }
      });

      const drivers = driversResponse.data?.drivers || [];
      
      if (drivers.length > 0) {
        assignedDriver = drivers[0];
        console.log(`✓ Found driver: ${assignedDriver.fullName} (${assignedDriver.distance.km}km away)`);
        
        // Step 3: Assign driver to booking
        booking = await bookingRepository.assignDriver(booking.id, assignedDriver.id);
        console.log(`✓ Booking ${booking.id} assigned to driver ${assignedDriver.id}`);
      } else {
        console.log('⚠️ No drivers available nearby');
      }
    } catch (driverError) {
      console.error('Failed to find nearby drivers:', driverError.message);
      // Continue without driver - booking stays in 'requested' status
    }
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        userId: booking.userId,
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
        dropoffLat: booking.dropoffLat,
        dropoffLng: booking.dropoffLng,
        note: booking.note,
        status: booking.status,
        assignedDriverId: booking.assignedDriverId,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt
      },
      driver: assignedDriver ? {
        id: assignedDriver.id,
        fullName: assignedDriver.fullName,
        rating: assignedDriver.rating,
        distance: assignedDriver.distance,
        vehicle: assignedDriver.vehicle
      } : null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get booking by ID
 */
async function getBooking(req, res, next) {
  try {
    const { id } = req.params;

    const booking = await bookingRepository.getBookingById(id);

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    res.json({
      booking
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get booking events (status history)
 */
async function getBookingEvents(req, res, next) {
  try {
    const { id } = req.params;

    // Check if booking exists
    const booking = await bookingRepository.getBookingById(id);
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    const events = await bookingRepository.getBookingEvents(id);

    res.json({
      bookingId: id,
      events
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get bookings by user ID
 */
async function getBookingsByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const bookings = await bookingRepository.getBookingsByUserId(userId, limit, offset);

    res.json({
      userId,
      bookings,
      limit,
      offset,
      count: bookings.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get bookings by driver ID
 */
async function getBookingsByDriver(req, res, next) {
  try {
    let { driverId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Check if driverId is actually a userId (from auth token)
    // If it doesn't exist in drivers table, try to find driver by userId
    const driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3005';
    
    try {
      // Try to get driver profile to ensure we have the right driverId
      const driverResponse = await http.get(`${driverServiceUrl}/drivers/${driverId}`);
      console.log('✓ Driver found by ID:', driverId);
      // If successful, driverId is correct
    } catch (error) {
      // Driver not found by ID, might be userId - try finding by userId
      console.log('⚠ Driver not found by ID, trying userId lookup for:', driverId);
      try {
        const driverByUserResponse = await http.get(`${driverServiceUrl}/drivers/user/${driverId}`);
        console.log('Driver lookup response:', JSON.stringify(driverByUserResponse));
        const driverData = driverByUserResponse.data || driverByUserResponse;
        console.log('Driver data:', JSON.stringify(driverData));
        if (driverData?.driver?.id) {
          const oldId = driverId;
          driverId = driverData.driver.id;
          console.log(`✓ Converted userId ${oldId} → driverId ${driverId}`);
        } else {
          console.log('⚠ No driver.id in response, data structure:', driverData);
        }
      } catch (userLookupError) {
        console.log('Could not find driver by ID or userId:', driverId);
        return res.status(404).json({
          error: 'Driver not found',
          driverId
        });
      }
    }

    const bookings = await bookingRepository.getBookingsByDriverId(driverId, limit, offset);

    res.json({
      driverId,
      bookings,
      limit,
      offset,
      count: bookings.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel booking
 */
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;

    // Check if booking exists
    const existingBooking = await bookingRepository.getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Check if booking can be cancelled
    const cancellableStatuses = ['requested', 'searching', 'assigned'];
    if (!cancellableStatuses.includes(existingBooking.status)) {
      return res.status(400).json({
        error: 'Booking cannot be cancelled',
        currentStatus: existingBooking.status
      });
    }

    const booking = await bookingRepository.cancelBooking(id);

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Driver accepts booking
 */
async function acceptBooking(req, res, next) {
  try {
    const { id } = req.params;
    console.log(`✅ Driver accepting booking ${id}`);

    // Check if booking exists
    const existingBooking = await bookingRepository.getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Check if booking is assigned
    if (existingBooking.status !== 'assigned') {
      return res.status(400).json({
        error: 'Booking is not in assigned status',
        currentStatus: existingBooking.status
      });
    }

    // Update status to 'accepted' (driver confirmed)
    const booking = await bookingRepository.updateBookingStatus(id, 'searching');
    
    console.log(`✓ Booking ${id} accepted by driver`);

    res.json({
      message: 'Booking accepted successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Driver rejects booking - auto reassign to next driver
 */
async function rejectBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log(`❌ Driver rejecting booking ${id}. Reason: ${reason || 'Not specified'}`);

    // Check if booking exists
    const existingBooking = await bookingRepository.getBookingById(id);
    if (!existingBooking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    // Check if booking is assigned
    if (existingBooking.status !== 'assigned') {
      return res.status(400).json({
        error: 'Booking is not in assigned status',
        currentStatus: existingBooking.status
      });
    }

    // Clear driver assignment
    await bookingRepository.clearDriverAssignment(id);
    console.log(`✓ Cleared driver assignment for booking ${id}`);

    /// Try to find another driver
    let newDriver = null;
    try {
      const driverServiceUrl = config.get('DRIVER_SERVICE_URL') || 'http://driver-service:3005';
      console.log(`🔍 Searching for another driver nearby...`);
      
      const driversResponse = await http.get(`${driverServiceUrl}/drivers/nearby`, {
        params: {
          lat: existingBooking.pickupLat,
          lng: existingBooking.pickupLng,
          radiusKm: 10,
          limit: 5 // Get top 5 to find next available
        }
      });

      const drivers = driversResponse.data?.drivers || [];
      
      // Find first driver that's not the one who rejected
      const availableDriver = drivers.find(d => d.id !== existingBooking.assignedDriverId);
      
      if (availableDriver) {
        newDriver = availableDriver;
        await bookingRepository.assignDriver(id, newDriver.id);
        console.log(`✓ Booking ${id} reassigned to driver ${newDriver.id}`);
      } else {
        // No more drivers available - set back to requested
        await bookingRepository.updateBookingStatus(id, 'requested');
        console.log(`⚠️ No more drivers available for booking ${id}`);
      }
    } catch (searchError) {
      console.error('Failed to find another driver:', searchError.message);
      await bookingRepository.updateBookingStatus(id, 'requested');
    }

    const booking = await bookingRepository.getBookingById(id);

    res.json({
      message: newDriver ? 'Booking reassigned to another driver' : 'No drivers available, booking set to requested',
      booking,
      newDriver: newDriver ? {
        id: newDriver.id,
        fullName: newDriver.fullName,
        distance: newDriver.distance
      } : null
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBooking,
  getBooking,
  getBookingEvents,
  getBookingsByUser,
  getBookingsByDriver,
  cancelBooking,
  acceptBooking,
  rejectBooking
};
