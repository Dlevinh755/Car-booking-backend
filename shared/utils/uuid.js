/**
 * UUID utilities
 * Wrapper around uuid library for consistent UUID generation
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a new UUID v4
 * @returns {string} - UUID string
 */
function generateUUID() {
  return uuidv4();
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean}
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

module.exports = {
  generateUUID,
  isValidUUID,
};
