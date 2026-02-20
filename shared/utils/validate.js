/**
 * Validation utilities
 * Common validation functions for request data
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Vietnamese format)
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone) return false;
  // Vietnamese phone: starts with 0, 10-11 digits
  const phoneRegex = /^0\d{9,10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {Object} - {valid: boolean, message: string}
 */
function validatePassword(password) {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  
  return { valid: true, message: 'Password is valid' };
}

/**
 * Validate latitude
 * @param {number} lat
 * @returns {boolean}
 */
function isValidLatitude(lat) {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude
 * @param {number} lng
 * @returns {boolean}
 */
function isValidLongitude(lng) {
  return typeof lng === 'number' && lng >= -180 && lng <= 180;
}

/**
 * Validate coordinates
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
function isValidCoordinates(lat, lng) {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Sanitize string input
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input.trim();
}

/**
 * Validate required fields in object
 * @param {Object} data - Data object
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} - {valid: boolean, missing: Array<string>}
 */
function validateRequiredFields(data, requiredFields) {
  const missing = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create validation error response
 * @param {string} message
 * @param {Array<string>} fields
 * @returns {Object}
 */
function createValidationError(message, fields = []) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: fields.length > 0 ? { missing_fields: fields } : undefined,
    },
  };
}

module.exports = {
  isValidEmail,
  isValidPhone,
  validatePassword,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  sanitizeString,
  validateRequiredFields,
  createValidationError,
};
