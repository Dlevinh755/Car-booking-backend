const db = require('../../../../shared/db');
const { generateId } = require('../../../../shared/utils/uuid');
const { calculateDistance } = require('../../../../shared/utils/haversine');

/**
 * Create a new ride
 * @param {Object} rideData - Ride creation data
 * @param {string} rideData.bookingId - Associated booking ID
 * @param {string} rideData.userId - User ID
 * @param {string} rideData.driverId - Driver ID
 * @param {number} rideData.pickupLat - Pickup latitude
 * @param {number} rideData.pickupLng - Pickup longitude
 * @param {number} rideData.dropoffLat - Dropoff latitude
 * @param {number} rideData.dropoffLng - Dropoff longitude
 * @returns {Promise<Object>} Created ride
 */
async function createRide(rideData) {
  const rideId = generateId();
  const now = new Date();

  const query = `
    INSERT INTO rides (
      id, booking_id, user_id, driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)
  `;

  await db.query(query, [
    rideId,
    rideData.bookingId,
    rideData.userId,
    rideData.driverId,
    rideData.pickupLat,
    rideData.pickupLng,
    rideData.dropoffLat,
    rideData.dropoffLng,
    now,
    now
  ]);

  // Create initial status event
  await createStatusEvent(rideId, 'created', null, null);

  return {
    id: rideId,
    bookingId: rideData.bookingId,
    userId: rideData.userId,
    driverId: rideData.driverId,
    pickupLat: rideData.pickupLat,
    pickupLng: rideData.pickupLng,
    dropoffLat: rideData.dropoffLat,
    dropoffLng: rideData.dropoffLng,
    status: 'created',
    distanceMeters: null,
    durationSeconds: null,
    finalFareAmount: null,
    fareId: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Get ride by ID
 * @param {string} rideId - Ride ID
 * @returns {Promise<Object|null>} Ride or null if not found
 */
async function getRideById(rideId) {
  const query = `
    SELECT 
      id, booking_id, user_id, driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, distance_meters, duration_seconds,
      final_fare_amount, fare_id,
      started_at, completed_at, created_at, updated_at
    FROM rides
    WHERE id = ?
  `;

  const [rows] = await db.query(query, [rideId]);
  
  if (rows.length === 0) {
    return null;
  }

  const ride = rows[0];
  return {
    id: ride.id,
    bookingId: ride.booking_id,
    userId: ride.user_id,
    driverId: ride.driver_id,
    pickupLat: parseFloat(ride.pickup_lat),
    pickupLng: parseFloat(ride.pickup_lng),
    dropoffLat: parseFloat(ride.dropoff_lat),
    dropoffLng: parseFloat(ride.dropoff_lng),
    status: ride.status,
    distanceMeters: ride.distance_meters,
    durationSeconds: ride.duration_seconds,
    finalFareAmount: ride.final_fare_amount,
    fareId: ride.fare_id,
    startedAt: ride.started_at,
    completedAt: ride.completed_at,
    createdAt: ride.created_at,
    updatedAt: ride.updated_at
  };
}

/**
 * Get ride by booking ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object|null>} Ride or null if not found
 */
async function getRideByBookingId(bookingId) {
  const query = `
    SELECT 
      id, booking_id, user_id, driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, distance_meters, duration_seconds,
      final_fare_amount, fare_id,
      started_at, completed_at, created_at, updated_at
    FROM rides
    WHERE booking_id = ?
  `;

  const [rows] = await db.query(query, [bookingId]);
  
  if (rows.length === 0) {
    return null;
  }

  const ride = rows[0];
  return {
    id: ride.id,
    bookingId: ride.booking_id,
    userId: ride.user_id,
    driverId: ride.driver_id,
    pickupLat: parseFloat(ride.pickup_lat),
    pickupLng: parseFloat(ride.pickup_lng),
    dropoffLat: parseFloat(ride.dropoff_lat),
    dropoffLng: parseFloat(ride.dropoff_lng),
    status: ride.status,
    distanceMeters: ride.distance_meters,
    durationSeconds: ride.duration_seconds,
    finalFareAmount: ride.final_fare_amount,
    fareId: ride.fare_id,
    startedAt: ride.started_at,
    completedAt: ride.completed_at,
    createdAt: ride.created_at,
    updatedAt: ride.updated_at
  };
}

/**
 * Update ride status
 * @param {string} rideId - Ride ID
 * @param {string} newStatus - New status
 * @param {number} [lat] - Current latitude (for location events)
 * @param {number} [lng] - Current longitude (for location events)
 * @returns {Promise<Object>} Updated ride
 */
async function updateRideStatus(rideId, newStatus, lat = null, lng = null) {
  const now = new Date();
  let updateFields = ['status = ?', 'updated_at = ?'];
  let updateValues = [newStatus, now];

  // Set started_at when status becomes 'picked_up'
  if (newStatus === 'picked_up') {
    updateFields.push('started_at = ?');
    updateValues.push(now);
  }

  // Set completed_at when status becomes 'completed' or 'cancelled'
  if (newStatus === 'completed' || newStatus === 'cancelled') {
    updateFields.push('completed_at = ?');
    updateValues.push(now);
  }

  updateValues.push(rideId);

  const query = `
    UPDATE rides
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `;

  await db.query(query, updateValues);

  // Create status event
  await createStatusEvent(rideId, newStatus, lat, lng);

  return getRideById(rideId);
}

/**
 * Update ride with fare information
 * @param {string} rideId - Ride ID
 * @param {number} distanceMeters - Actual distance in meters
 * @param {number} durationSeconds - Actual duration in seconds
 * @param {number} finalFareAmount - Final fare amount
 * @param {string} fareId - Fare ID from pricing service
 * @returns {Promise<Object>} Updated ride
 */
async function updateRideFare(rideId, distanceMeters, durationSeconds, finalFareAmount, fareId) {
  const query = `
    UPDATE rides
    SET 
      distance_meters = ?,
      duration_seconds = ?,
      final_fare_amount = ?,
      fare_id = ?,
      updated_at = ?
    WHERE id = ?
  `;

  await db.query(query, [
    distanceMeters,
    durationSeconds,
    finalFareAmount,
    fareId,
    new Date(),
    rideId
  ]);

  return getRideById(rideId);
}

/**
 * Get rides by user ID
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of rides to return
 * @param {number} offset - Number of rides to skip
 * @returns {Promise<Array>} List of rides
 */
async function getRidesByUserId(userId, limit = 20, offset = 0) {
  const query = `
    SELECT 
      id, booking_id, user_id, driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, distance_meters, duration_seconds,
      final_fare_amount, fare_id,
      started_at, completed_at, created_at, updated_at
    FROM rides
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.query(query, [userId, limit, offset]);

  return rows.map(ride => ({
    id: ride.id,
    bookingId: ride.booking_id,
    userId: ride.user_id,
    driverId: ride.driver_id,
    pickupLat: parseFloat(ride.pickup_lat),
    pickupLng: parseFloat(ride.pickup_lng),
    dropoffLat: parseFloat(ride.dropoff_lat),
    dropoffLng: parseFloat(ride.dropoff_lng),
    status: ride.status,
    distanceMeters: ride.distance_meters,
    durationSeconds: ride.duration_seconds,
    finalFareAmount: ride.final_fare_amount,
    fareId: ride.fare_id,
    startedAt: ride.started_at,
    completedAt: ride.completed_at,
    createdAt: ride.created_at,
    updatedAt: ride.updated_at
  }));
}

/**
 * Get rides by driver ID
 * @param {string} driverId - Driver ID
 * @param {number} limit - Maximum number of rides to return
 * @param {number} offset - Number of rides to skip
 * @returns {Promise<Array>} List of rides
 */
async function getRidesByDriverId(driverId, limit = 20, offset = 0) {
  const query = `
    SELECT 
      id, booking_id, user_id, driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, distance_meters, duration_seconds,
      final_fare_amount, fare_id,
      started_at, completed_at, created_at, updated_at
    FROM rides
    WHERE driver_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.query(query, [driverId, limit, offset]);

  return rows.map(ride => ({
    id: ride.id,
    bookingId: ride.booking_id,
    userId: ride.user_id,
    driverId: ride.driver_id,
    pickupLat: parseFloat(ride.pickup_lat),
    pickupLng: parseFloat(ride.pickup_lng),
    dropoffLat: parseFloat(ride.dropoff_lat),
    dropoffLng: parseFloat(ride.dropoff_lng),
    status: ride.status,
    distanceMeters: ride.distance_meters,
    durationSeconds: ride.duration_seconds,
    finalFareAmount: ride.final_fare_amount,
    fareId: ride.fare_id,
    startedAt: ride.started_at,
    completedAt: ride.completed_at,
    createdAt: ride.created_at,
    updatedAt: ride.updated_at
  }));
}

/**
 * Create a ride status event
 * @param {string} rideId - Ride ID
 * @param {string} status - Status
 * @param {number} [lat] - Latitude
 * @param {number} [lng] - Longitude
 */
async function createStatusEvent(rideId, status, lat = null, lng = null) {
  const eventId = generateId();
  
  const query = `
    INSERT INTO ride_status_events (
      id, ride_id, status, lat, lng, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  await db.query(query, [
    eventId,
    rideId,
    status,
    lat,
    lng,
    new Date()
  ]);
}

/**
 * Get status events for a ride
 * @param {string} rideId - Ride ID
 * @returns {Promise<Array>} List of status events
 */
async function getStatusEvents(rideId) {
  const query = `
    SELECT id, ride_id, status, lat, lng, created_at
    FROM ride_status_events
    WHERE ride_id = ?
    ORDER BY created_at ASC
  `;

  const [rows] = await db.query(query, [rideId]);

  return rows.map(event => ({
    id: event.id,
    rideId: event.ride_id,
    status: event.status,
    lat: event.lat ? parseFloat(event.lat) : null,
    lng: event.lng ? parseFloat(event.lng) : null,
    createdAt: event.created_at
  }));
}

/**
 * Calculate actual distance for a ride
 * @param {string} rideId - Ride ID
 * @returns {Promise<number>} Distance in meters
 */
async function calculateRideDistance(rideId) {
  const ride = await getRideById(rideId);
  
  if (!ride) {
    throw new Error('Ride not found');
  }

  // Calculate straight-line distance using Haversine formula
  const distanceMeters = calculateDistance(
    ride.pickupLat,
    ride.pickupLng,
    ride.dropoffLat,
    ride.dropoffLng
  );

  return Math.round(distanceMeters);
}

/**
 * Calculate ride duration in seconds
 * @param {string} rideId - Ride ID
 * @returns {Promise<number>} Duration in seconds
 */
async function calculateRideDuration(rideId) {
  const ride = await getRideById(rideId);
  
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (!ride.startedAt || !ride.completedAt) {
    throw new Error('Ride does not have start and end times');
  }

  const durationMs = new Date(ride.completedAt) - new Date(ride.startedAt);
  return Math.round(durationMs / 1000);
}

module.exports = {
  createRide,
  getRideById,
  getRideByBookingId,
  updateRideStatus,
  updateRideFare,
  getRidesByUserId,
  getRidesByDriverId,
  createStatusEvent,
  getStatusEvents,
  calculateRideDistance,
  calculateRideDuration
};
