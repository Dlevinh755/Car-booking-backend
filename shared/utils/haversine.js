/**
 * Haversine distance calculation
 * Calculate distance between two GPS coordinates
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1 (decimal degrees)
 * @param {number} lng1 - Longitude of point 1 (decimal degrees)
 * @param {number} lat2 - Latitude of point 2 (decimal degrees)
 * @param {number} lng2 - Longitude of point 2 (decimal degrees)
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = R * c;
  
  return Math.round(distance); // Return rounded meters
}

/**
 * Calculate distance in kilometers
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} - Distance in kilometers
 */
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  const meters = calculateDistance(lat1, lng1, lat2, lng2);
  return meters / 1000;
}

module.exports = {
  calculateDistance,
  calculateDistanceKm,
};
