/**
 * Driver Controller
 * Business logic for driver operations
 */

const { HTTP_STATUS, ERROR_CODES } = require('../../../shared/constants/statuses');
const driverRepository = require('../repositories/driverRepository');
const { isValidPhone, isValidCoordinates } = require('../../../shared/utils/validate');

/**
 * Register driver
 */
async function register(req, res, next) {
  try {
    console.log('=== DRIVER REGISTER ATTEMPT ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { userId, fullName, phone, plateNumber, vehicleType, licenseNumber, make, model, color } = req.body;
    
    console.log('Extracted fields:');
    console.log('  userId:', userId);
    console.log('  fullName:', fullName);
    console.log('  phone:', phone);
    console.log('  plateNumber:', plateNumber);
    console.log('  vehicleType:', vehicleType);
    console.log('  licenseNumber:', licenseNumber);
    
    if (!fullName || !phone || !plateNumber) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'fullName, phone, and plateNumber are required',
        },
      });
    }
    
    // Validate phone
    if (!isValidPhone(phone)) {
      console.log('❌ Validation failed: Invalid phone format');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid phone number format',
        },
      });
    }
    
    // Check if user_id already has driver profile
    if (userId) {
      const existingByUserId = await driverRepository.findByUserId(userId);
      if (existingByUserId) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: {
            code: ERROR_CODES.DUPLICATE_ERROR,
            message: 'User already has a driver profile',
          },
        });
      }
    }
    
    // Check if phone already exists
    const phoneInUse = await driverRepository.phoneExists(phone);
    if (phoneInUse) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {
          code: ERROR_CODES.DUPLICATE_ERROR,
          message: 'Phone number already registered',
        },
      });
    }
    
    // Check if plate number already exists
    const plateInUse = await driverRepository.plateNumberExists(plateNumber);
    if (plateInUse) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {
          code: ERROR_CODES.DUPLICATE_ERROR,
          message: 'Plate number already registered',
        },
      });
    }
    
    // Create driver and vehicle
    const driverId = await driverRepository.createDriver(userId, fullName, phone);
    await driverRepository.createVehicle(
      driverId, 
      vehicleType || '4-seater',
      plateNumber, 
      licenseNumber,
      make, 
      model, 
      color
    );
    
    const driver = await driverRepository.findById(driverId);
    
    res.status(HTTP_STATUS.CREATED).json({
      message: 'Driver registered successfully',
      data: {
        id: driver.id,
        userId: driver.user_id,
        fullName: driver.full_name,
        phone: driver.phone,
        status: driver.status,
        vehicle: {
          vehicleType: driver.vehicle_type,
          plateNumber: driver.plate_number,
          licenseNumber: driver.license_number,
          make: driver.make,
          model: driver.model,
          color: driver.color,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver by user ID
 */
async function getDriverByUserId(req, res, next) {
  try {
    const { userId } = req.params;
    
    const driver = await driverRepository.findByUserId(userId);
    
    if (!driver) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Driver not found',
        },
      });
    }
    
    res.json({
      driver: {
        id: driver.id,
        userId: driver.user_id,
        fullName: driver.full_name,
        phone: driver.phone,
        status: driver.status,
        rating: driver.rating_avg,
        vehicle: driver.vehicle_id ? {
          type: driver.vehicle_type,
          plateNumber: driver.plate_number,
          make: driver.make,
          model: driver.model,
          color: driver.color,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update driver presence
 */
async function updatePresence(req, res, next) {
  try {
    console.log('📍 Update presence request:', req.body);
    console.log('👤 User from token:', req.user);
    
    const { isOnline, lat, lng } = req.body;
    
    if (isOnline === undefined) {
      console.log('❌ Missing isOnline field');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'isOnline is required',
        },
      });
    }
    
    // If going online, coordinates are required
    if (isOnline && (!lat || !lng)) {
      console.log('❌ Missing coordinates for online status');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'lat and lng are required when going online',
        },
      });
    }
    
    // Validate coordinates if provided
    if ((lat || lng) && !isValidCoordinates(lat, lng)) {
      console.log('❌ Invalid coordinates:', { lat, lng });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid coordinates',
        },
      });
    }
    
    // For MVP, we'll allow any authenticated user to update presence
    // In production, this should verify the user is a driver
    const userId = req.user?.sub;
    
    if (!userId) {
      console.log('❌ No userId from token');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: {
          code: ERROR_CODES.AUTHENTICATION_ERROR,
          message: 'Authentication required',
        },
      });
    }
    
    // Look up driver by userId to get driver.id
    const driver = await driverRepository.findByUserId(userId);
    
    if (!driver) {
      console.log('❌ Driver not found for userId:', userId);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Driver not found',
        },
      });
    }
    
    const driverId = driver.id;
    console.log('✅ Updating presence for driver:', driverId, '(userId:', userId, ')');
    
    await driverRepository.updatePresence(
      driverId,
      isOnline,
      isOnline ? lat : null,
      isOnline ? lng : null
    );
    
    const presence = await driverRepository.getPresence(driverId);
    
    res.json({
      message: 'Presence updated successfully',
      data: {
        driverId: presence.driver_id,
        isOnline: Boolean(presence.is_online),
        location: presence.current_lat ? {
          lat: parseFloat(presence.current_lat),
          lng: parseFloat(presence.current_lng),
        } : null,
        updatedAt: presence.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver by ID
 */
async function getDriverById(req, res, next) {
  try {
    const { id } = req.params;
    
    const driver = await driverRepository.findById(id);
    
    if (!driver) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Driver not found',
        },
      });
    }
    
    res.json({
      data: {
        id: driver.id,
        fullName: driver.full_name,
        phone: driver.phone,
        status: driver.status,
        rating: driver.rating_avg,
        vehicle: driver.plate_number ? {
          plateNumber: driver.plate_number,
          make: driver.make,
          model: driver.model,
          color: driver.color,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Find nearby drivers
 */
async function findNearby(req, res, next) {
  try {
    const { lat, lng, radiusKm = 5, limit = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'lat and lng are required',
        },
      });
    }
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid coordinates',
        },
      });
    }
    
    const radius = Math.min(parseFloat(radiusKm) || 5, 20); // Max 20km
    const maxLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 drivers
    
    const drivers = await driverRepository.findNearbyDrivers(
      latitude,
      longitude,
      radius,
      maxLimit
    );
    
    res.json({
      data: {
        drivers: drivers.map(d => ({
          id: d.id,
          fullName: d.full_name,
          rating: d.rating_avg,
          distance: {
            meters: d.distance_meters,
            km: parseFloat(d.distance_km),
          },
          location: {
            lat: parseFloat(d.current_lat),
            lng: parseFloat(d.current_lng),
          },
          vehicle: d.plate_number ? {
            plateNumber: d.plate_number,
            make: d.make,
            model: d.model,
          } : null,
        })),
        count: drivers.length,
        searchRadius: radius,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  updatePresence,
  getDriverById,
  getDriverByUserId,
  findNearby,
};
