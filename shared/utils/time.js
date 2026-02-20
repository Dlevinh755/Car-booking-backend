/**
 * Time utilities
 * Helper functions for datetime operations
 */

/**
 * Get current timestamp in ISO format
 * @returns {string}
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Add days to a date
 * @param {Date} date - Base date
 * @param {number} days - Days to add
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add minutes to a date
 * @param {Date} date - Base date
 * @param {number} minutes - Minutes to add
 * @returns {Date}
 */
function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Format date for MySQL TIMESTAMP
 * @param {Date} date
 * @returns {string}
 */
function toMySQLTimestamp(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Parse duration string to milliseconds
 * Examples: '15m', '30d', '1h'
 * @param {string} duration
 * @returns {number} milliseconds
 */
function parseDuration(duration) {
  const regex = /^(\d+)([smhd])$/;
  const match = duration.match(regex);
  
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

module.exports = {
  getCurrentTimestamp,
  addDays,
  addMinutes,
  toMySQLTimestamp,
  parseDuration,
};
