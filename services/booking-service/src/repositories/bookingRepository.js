const db = require('../../../../shared/db');
const { generateUUID } = require('../../../../shared/utils/uuid');

/**
 * Create a new booking
 * @param {Object} bookingData - Booking creation data
 * @param {string} bookingData.userId - User ID
 * @param {number} bookingData.pickupLat - Pickup latitude
 * @param {number} bookingData.pickupLng - Pickup longitude
 * @param {number} bookingData.dropoffLat - Dropoff latitude
 * @param {number} bookingData.dropoffLng - Dropoff longitude
 * @param {string} [bookingData.note] - Booking note
 * @returns {Promise<Object>} Created booking
 */
async function createBooking(bookingData) {
  const bookingId = generateUUID();
  const now = new Date();

  const query = `
    INSERT INTO bookings (
      id, user_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?)
  `;

  await db.query(query, [
    bookingId,
    bookingData.userId,
    bookingData.pickupLat,
    bookingData.pickupLng,
    bookingData.dropoffLat,
    bookingData.dropoffLng,
    bookingData.note || null,
    now,
    now
  ]);

  // Create initial booking event
  await createBookingEvent(bookingId, 'requested');

  return {
    id: bookingId,
    userId: bookingData.userId,
    pickupLat: bookingData.pickupLat,
    pickupLng: bookingData.pickupLng,
    dropoffLat: bookingData.dropoffLat,
    dropoffLng: bookingData.dropoffLng,
    status: 'requested',
    pricingQuoteId: null,
    estimatedFareAmount: null,
    assignedDriverId: null,
    note: bookingData.note || null,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object|null>} Booking or null if not found
 */
async function getBookingById(bookingId) {
  const query = `
    SELECT 
      id, user_id, pricing_quote_id, assigned_driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, estimated_fare_amount, note,
      created_at, updated_at
    FROM bookings
    WHERE id = ?
  `;

  const rows = await db.query(query, [bookingId]);
  
  if (!rows || rows.length === 0) {
    return null;
  }

  const booking = rows[0];
  return {
    id: booking.id,
    userId: booking.user_id,
    pricingQuoteId: booking.pricing_quote_id,
    assignedDriverId: booking.assigned_driver_id,
    pickupLat: parseFloat(booking.pickup_lat),
    pickupLng: parseFloat(booking.pickup_lng),
    dropoffLat: parseFloat(booking.dropoff_lat),
    dropoffLng: parseFloat(booking.dropoff_lng),
    status: booking.status,
    estimatedFareAmount: booking.estimated_fare_amount,
    note: booking.note,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  };
}

/**
 * Update booking with pricing information
 * @param {string} bookingId - Booking ID
 * @param {string} pricingQuoteId - Pricing quote ID
 * @param {number} estimatedFareAmount - Estimated fare amount
 * @returns {Promise<Object>} Updated booking
 */
async function updateBookingPricing(bookingId, pricingQuoteId, estimatedFareAmount) {
  const query = `
    UPDATE bookings
    SET pricing_quote_id = ?, estimated_fare_amount = ?, updated_at = ?
    WHERE id = ?
  `;

  await db.query(query, [pricingQuoteId, estimatedFareAmount, new Date(), bookingId]);

  return getBookingById(bookingId);
}

/**
 * Update booking status
 * @param {string} bookingId - Booking ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object>} Updated booking
 */
async function updateBookingStatus(bookingId, newStatus) {
  const query = `
    UPDATE bookings
    SET status = ?, updated_at = ?
    WHERE id = ?
  `;

  await db.query(query, [newStatus, new Date(), bookingId]);

  // Create booking event
  await createBookingEvent(bookingId, newStatus);

  return getBookingById(bookingId);
}

/**
 * Assign driver to booking
 * @param {string} bookingId - Booking ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} Updated booking
 */
async function assignDriver(bookingId, driverId) {
  const query = `
    UPDATE bookings
    SET assigned_driver_id = ?, status = 'assigned', updated_at = ?
    WHERE id = ?
  `;

  await db.query(query, [driverId, new Date(), bookingId]);

  // Create booking event
  await createBookingEvent(bookingId, 'assigned', { driverId });

  return getBookingById(bookingId);
}

/**
 * Clear driver assignment (for reassignment)
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Updated booking
 */
async function clearDriverAssignment(bookingId) {
  const query = `
    UPDATE bookings
    SET assigned_driver_id = NULL, status = 'requested', updated_at = ?
    WHERE id = ?
  `;

  await db.query(query, [new Date(), bookingId]);

  // Create booking event
  await createBookingEvent(bookingId, 'driver_rejected', null);

  return getBookingById(bookingId);
}

/**
 * Get bookings by user ID
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of bookings to return
 * @param {number} offset - Number of bookings to skip
 * @returns {Promise<Array>} List of bookings
 */
async function getBookingsByUserId(userId, limit = 20, offset = 0) {
  // Ensure limit and offset are integers for safe string interpolation
  const safeLimit = parseInt(limit) || 20;
  const safeOffset = parseInt(offset) || 0;
  
  const query = `
    SELECT 
      id, user_id, pricing_quote_id, assigned_driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, estimated_fare_amount, note,
      created_at, updated_at
    FROM bookings
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

  const rows = await db.query(query, [userId]);

  if (!rows) {
    return [];
  }

  return rows.map(booking => ({
    id: booking.id,
    userId: booking.user_id,
    pricingQuoteId: booking.pricing_quote_id,
    assignedDriverId: booking.assigned_driver_id,
    pickupLat: parseFloat(booking.pickup_lat),
    pickupLng: parseFloat(booking.pickup_lng),
    dropoffLat: parseFloat(booking.dropoff_lat),
    dropoffLng: parseFloat(booking.dropoff_lng),
    status: booking.status,
    estimatedFareAmount: booking.estimated_fare_amount,
    note: booking.note,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  }));
}

/**
 * Get bookings by driver ID
 * @param {string} driverId - Driver ID
 * @param {number} limit - Maximum number of bookings to return
 * @param {number} offset - Number of bookings to skip
 * @returns {Promise<Array>} List of bookings
 */
async function getBookingsByDriverId(driverId, limit = 20, offset = 0) {
  // Ensure limit and offset are integers for safe string interpolation
  const safeLimit = parseInt(limit) || 20;
  const safeOffset = parseInt(offset) || 0;
  
  const query = `
    SELECT 
      id, user_id, pricing_quote_id, assigned_driver_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      status, estimated_fare_amount, note,
      created_at, updated_at
    FROM bookings
    WHERE assigned_driver_id = ?
    ORDER BY created_at DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

  const rows = await db.query(query, [driverId]);

  if (!rows) {
    return [];
  }

  return rows.map(booking => ({
    id: booking.id,
    userId: booking.user_id,
    pricingQuoteId: booking.pricing_quote_id,
    assignedDriverId: booking.assigned_driver_id,
    pickupLat: parseFloat(booking.pickup_lat),
    pickupLng: parseFloat(booking.pickup_lng),
    dropoffLat: parseFloat(booking.dropoff_lat),
    dropoffLng: parseFloat(booking.dropoff_lng),
    status: booking.status,
    estimatedFareAmount: booking.estimated_fare_amount,
    note: booking.note,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at
  }));
}

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Updated booking
 */
async function cancelBooking(bookingId) {
  const query = `
    UPDATE bookings
    SET status = 'cancelled', updated_at = ?
    WHERE id = ?
  `;

  await db.query(query, [new Date(), bookingId]);

  // Create booking event
  await createBookingEvent(bookingId, 'cancelled');

  return getBookingById(bookingId);
}

/**
 * Create a booking event
 * @param {string} bookingId - Booking ID
 * @param {string} type - Event type
 * @param {Object} [payload] - Event payload
 */
async function createBookingEvent(bookingId, type, payload = null) {
  const eventId = generateUUID();
  
  const query = `
    INSERT INTO booking_events (
      id, booking_id, type, payload, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `;

  await db.query(query, [
    eventId,
    bookingId,
    type,
    payload ? JSON.stringify(payload) : null,
    new Date()
  ]);
}

/**
 * Get booking events
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Array>} List of booking events
 */
async function getBookingEvents(bookingId) {
  const query = `
    SELECT id, booking_id, status, metadata, created_at
    FROM booking_events
    WHERE booking_id = ?
    ORDER BY created_at ASC
  `;

  const [rows] = await db.query(query, [bookingId]);

  return rows.map(event => ({
    id: event.id,
    bookingId: event.booking_id,
    status: event.status,
    metadata: event.metadata ? JSON.parse(event.metadata) : null,
    createdAt: event.created_at
  }));
}

module.exports = {
  createBooking,
  getBookingById,
  updateBookingPricing,
  updateBookingStatus,
  assignDriver,
  clearDriverAssignment,
  getBookingsByUserId,
  getBookingsByDriverId,
  cancelBooking,
  createBookingEvent,
  getBookingEvents
};
