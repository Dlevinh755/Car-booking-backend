/**
 * Driver Repository
 * Database operations for driver management
 */

const db = require('../../../shared/db');
const { generateUUID } = require('../../../shared/utils/uuid');
const { calculateDistance } = require('../../../shared/utils/haversine');

/**
 * Create driver
 */
async function createDriver(userId, fullName, phone) {
  const id = generateUUID();
  
  const sql = `
    INSERT INTO drivers (id, user_id, full_name, phone, status)
    VALUES (?, ?, ?, ?, 'pending')
  `;
  
  await db.query(sql, [id, userId || null, fullName, phone]);
  return id;
}

/**
 * Create vehicle
 */
async function createVehicle(driverId, vehicleType, plateNumber, licenseNumber = null, make = null, model = null, color = null) {
  const id = generateUUID();
  
  const sql = `
    INSERT INTO vehicles (id, driver_id, vehicle_type, plate_number, license_number, make, model, color, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;
  
  await db.query(sql, [id, driverId, vehicleType, plateNumber, licenseNumber, make, model, color]);
  return id;
}

/**
 * Find driver by ID
 */
async function findById(driverId) {
  const sql = `
    SELECT d.id, d.user_id, d.full_name, d.phone, d.status, d.rating_avg, d.created_at,
           v.id as vehicle_id, v.vehicle_type, v.plate_number, v.license_number, 
           v.make, v.model, v.color
    FROM drivers d
    LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
    WHERE d.id = ?
  `;
  
  return await db.queryOne(sql, [driverId]);
}

/**
 * Find driver by user_id
 */
async function findByUserId(userId) {
  const sql = `
    SELECT d.id, d.user_id, d.full_name, d.phone, d.status, d.rating_avg, d.created_at,
           v.id as vehicle_id, v.vehicle_type, v.plate_number, v.license_number,
           v.make, v.model, v.color
    FROM drivers d
    LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
    WHERE d.user_id = ?
  `;
  
  return await db.queryOne(sql, [userId]);
}

/**
 * Find driver by phone
 */
async function findByPhone(phone) {
  const sql = `
    SELECT id, user_id, full_name, phone, status, rating_avg, created_at
    FROM drivers
    WHERE phone = ?
  `;
  
  return await db.queryOne(sql, [phone]);
}

/**
 * Update driver presence
 */
async function updatePresence(driverId, isOnline, lat = null, lng = null) {
  const sql = `
    INSERT INTO driver_presence (driver_id, is_online, current_lat, current_lng, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE
      is_online = VALUES(is_online),
      current_lat = VALUES(current_lat),
      current_lng = VALUES(current_lng),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  await db.query(sql, [driverId, isOnline, lat, lng]);
}

/**
 * Get driver presence
 */
async function getPresence(driverId) {
  const sql = `
    SELECT driver_id, is_online, current_lat, current_lng, updated_at
    FROM driver_presence
    WHERE driver_id = ?
  `;
  
  return await db.queryOne(sql, [driverId]);
}

/**
 * Find nearby online drivers
 */
async function findNearbyDrivers(lat, lng, radiusKm = 5, limit = 10) {
  const safeLimit = parseInt(limit) * 3 || 30; // Get more than needed for filtering
  
  const sql = `
    SELECT d.id, d.full_name, d.phone, d.rating_avg,
           dp.current_lat, dp.current_lng, dp.updated_at,
           v.plate_number, v.make, v.model
    FROM drivers d
    INNER JOIN driver_presence dp ON d.id = dp.driver_id
    LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = TRUE
    WHERE d.status = 'active'
      AND dp.is_online = TRUE
      AND dp.current_lat IS NOT NULL
      AND dp.current_lng IS NOT NULL
      AND dp.updated_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    ORDER BY dp.updated_at DESC
    LIMIT ${safeLimit}
  `;
  
  const drivers = await db.query(sql);
  
  if (!drivers || drivers.length === 0) {
    return [];
  }
  
  // Filter by distance using Haversine
  const driversWithDistance = drivers
    .map(driver => {
      const distance = calculateDistance(
        lat,
        lng,
        parseFloat(driver.current_lat),
        parseFloat(driver.current_lng)
      );
      return {
        ...driver,
        distance_meters: distance,
        distance_km: (distance / 1000).toFixed(2),
      };
    })
    .filter(driver => driver.distance_meters <= radiusKm * 1000)
    .sort((a, b) => a.distance_meters - b.distance_meters)
    .slice(0, parseInt(limit) || 10);
  
  return driversWithDistance;
}

/**
 * Check if phone exists
 */
async function phoneExists(phone) {
  const sql = `
    SELECT COUNT(*) as count
    FROM drivers
    WHERE phone = ?
  `;
  
  const result = await db.queryOne(sql, [phone]);
  return result.count > 0;
}

/**
 * Check if plate number exists
 */
async function plateNumberExists(plateNumber) {
  const sql = `
    SELECT COUNT(*) as count
    FROM vehicles
    WHERE plate_number = ?
  `;
  
  const result = await db.queryOne(sql, [plateNumber]);
  return result.count > 0;
}

module.exports = {
  createDriver,
  createVehicle,
  findById,
  findByUserId,
  findByPhone,
  updatePresence,
  getPresence,
  findNearbyDrivers,
  phoneExists,
  plateNumberExists,
};
