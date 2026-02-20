/**
 * Pricing Repository
 * Database operations for pricing quotes and fares
 */

const db = require('../../../shared/db');
const { generateUUID } = require('../../../shared/utils/uuid');
const { calculateDistance } = require('../../../shared/utils/haversine');
const { addMinutes, toMySQLTimestamp } = require('../../../shared/utils/time');

/**
 * Get active pricing rule (or default)
 */
async function getActivePricingRule(ruleId = null) {
  let sql;
  let params = [];
  
  if (ruleId) {
    sql = `
      SELECT * FROM pricing_rules
      WHERE id = ? AND is_active = TRUE
    `;
    params = [ruleId];
  } else {
    sql = `
      SELECT * FROM pricing_rules
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `;
  }
  
  return await db.queryOne(sql, params);
}

/**
 * Create pricing quote
 */
async function createQuote(bookingId, pickupLat, pickupLng, dropoffLat, dropoffLng, rule) {
  const id = generateUUID();
  
  // Calculate raw distance using Haversine
  const rawDistanceMeters = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  
  // Apply route factor
  const adjustedDistanceMeters = Math.round(rawDistanceMeters * parseFloat(rule.route_factor));
  const adjustedDistanceKm = adjustedDistanceMeters / 1000;
  
  // Round up to km step
  const kmStep = parseFloat(rule.rounding_km_step);
  const roundedKm = Math.ceil(adjustedDistanceKm / kmStep) * kmStep;
  
  // Calculate fare components
  const baseFare = parseInt(rule.base_fare);
  const distanceFare = Math.round(roundedKm * parseInt(rule.per_km));
  const bookingFee = parseInt(rule.booking_fee);
  const minimumFare = parseInt(rule.minimum_fare);
  
  // Calculate subtotal
  let subtotal = baseFare + distanceFare + bookingFee;
  subtotal = Math.max(subtotal, minimumFare);
  
  // Apply multipliers
  const surgeMultiplier = parseFloat(rule.surge_multiplier);
  const nightMultiplier = parseFloat(rule.night_multiplier);
  const totalMultiplier = surgeMultiplier * nightMultiplier;
  
  // Calculate total and round to currency unit
  const currencyUnit = parseInt(rule.rounding_currency_unit);
  let total = Math.round(subtotal * totalMultiplier);
  total = Math.ceil(total / currencyUnit) * currencyUnit;
  
  // Estimate duration (simple: distance_km / average_speed_kmh * 60 = minutes)
  const avgSpeedKmh = 25;
  const estimatedDurationMinutes = Math.round((adjustedDistanceKm / avgSpeedKmh) * 60);
  const estimatedDurationSeconds = estimatedDurationMinutes * 60;
  
  // Build breakdown JSON
  const breakdown = {
    base_fare: baseFare,
    distance_fare: distanceFare,
    booking_fee: bookingFee,
    subtotal_before_minimum: baseFare + distanceFare + bookingFee,
    minimum_fare: minimumFare,
    subtotal_after_minimum: subtotal,
    surge_multiplier: surgeMultiplier,
    night_multiplier: nightMultiplier,
    total_multiplier: totalMultiplier,
    total_before_rounding: subtotal * totalMultiplier,
    total_after_rounding: total,
    distance: {
      raw_meters: rawDistanceMeters,
      adjusted_meters: adjustedDistanceMeters,
      adjusted_km: adjustedDistanceKm,
      rounded_km: roundedKm,
      route_factor: parseFloat(rule.route_factor),
      rounding_km_step: kmStep,
    },
  };
  
  // Set expiration (60 minutes from now)
  const expiresAt = toMySQLTimestamp(addMinutes(new Date(), 60));
  
  const sql = `
    INSERT INTO pricing_quotes (
      id, booking_id, rule_id,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
      raw_distance_meters, adjusted_distance_meters, estimated_duration_seconds,
      estimated_fare_amount, currency,
      route_factor_used, rounding_km_step_used, multiplier_used,
      breakdown_json, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await db.query(sql, [
    id, bookingId, rule.id,
    pickupLat, pickupLng, dropoffLat, dropoffLng,
    rawDistanceMeters, adjustedDistanceMeters, estimatedDurationSeconds,
    total, rule.currency,
    rule.route_factor, rule.rounding_km_step, totalMultiplier,
    JSON.stringify(breakdown), expiresAt,
  ]);
  
  return { id, total, breakdown, estimatedDurationSeconds };
}

/**
 * Get quote by ID
 */
async function getQuoteById(quoteId) {
  const sql = `
    SELECT * FROM pricing_quotes
    WHERE id = ?
  `;
  
  return await db.queryOne(sql, [quoteId]);
}

/**
 * Get quote by booking ID
 */
async function getQuoteByBookingId(bookingId) {
  const sql = `
    SELECT * FROM pricing_quotes
    WHERE booking_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  return await db.queryOne(sql, [bookingId]);
}

/**
 * Create final fare (when ride completes)
 */
async function createFare(rideId, quoteId, actualDistanceMeters, actualDurationSeconds, rule) {
  const id = generateUUID();
  
  // Calculate fare based on actual distance
  const actualDistanceKm = actualDistanceMeters / 1000;
  const kmStep = parseFloat(rule.rounding_km_step);
  const roundedKm = Math.ceil(actualDistanceKm / kmStep) * kmStep;
  
  const baseFare = parseInt(rule.base_fare);
  const distanceFare = Math.round(roundedKm * parseInt(rule.per_km));
  const bookingFee = parseInt(rule.booking_fee);
  const minimumFare = parseInt(rule.minimum_fare);
  
  let subtotal = baseFare + distanceFare + bookingFee;
  subtotal = Math.max(subtotal, minimumFare);
  
  const surgeMultiplier = parseFloat(rule.surge_multiplier);
  const nightMultiplier = parseFloat(rule.night_multiplier);
  const totalMultiplier = surgeMultiplier * nightMultiplier;
  
  const currencyUnit = parseInt(rule.rounding_currency_unit);
  let total = Math.round(subtotal * totalMultiplier);
  total = Math.ceil(total / currencyUnit) * currencyUnit;
  
  const breakdown = {
    base_fare: baseFare,
    distance_fare: distanceFare,
    booking_fee: bookingFee,
    subtotal: subtotal,
    multiplier: totalMultiplier,
    total: total,
    distance_km: actualDistanceKm,
    rounded_km: roundedKm,
    duration_seconds: actualDurationSeconds,
    duration_minutes: Math.round(actualDurationSeconds / 60),
  };
  
  const sql = `
    INSERT INTO pricing_fares (
      id, ride_id, quote_id,
      actual_distance_meters, actual_duration_seconds,
      subtotal_amount, discount_amount, total_amount, currency,
      rule_snapshot_json, breakdown_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await db.query(sql, [
    id, rideId, quoteId,
    actualDistanceMeters, actualDurationSeconds,
    subtotal, 0, total, rule.currency,
    JSON.stringify(rule), JSON.stringify(breakdown),
  ]);
  
  return { id, total, breakdown };
}

/**
 * Get fare by ride ID
 */
async function getFareByRideId(rideId) {
  const sql = `
    SELECT * FROM pricing_fares
    WHERE ride_id = ?
  `;
  
  return await db.queryOne(sql, [rideId]);
}

module.exports = {
  getActivePricingRule,
  createQuote,
  getQuoteById,
  getQuoteByBookingId,
  createFare,
  getFareByRideId,
};
