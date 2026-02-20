/**
 * User Repository
 * Database operations for user management
 */

const db = require('../../../shared/db');
const { generateUUID } = require('../../../shared/utils/uuid');

/**
 * Create user
 */
async function createUser(fullName, phone, email = null) {
  const id = generateUUID();
  
  const sql = `
    INSERT INTO users (id, full_name, phone, email)
    VALUES (?, ?, ?, ?)
  `;
  
  await db.query(sql, [id, fullName, phone, email]);
  return id;
}

/**
 * Find user by ID
 */
async function findById(userId) {
  const sql = `
    SELECT id, full_name, phone, email, rating_avg, created_at, updated_at
    FROM users
    WHERE id = ?
  `;
  
  return await db.queryOne(sql, [userId]);
}

/**
 * Find user by phone
 */
async function findByPhone(phone) {
  const sql = `
    SELECT id, full_name, phone, email, rating_avg, created_at, updated_at
    FROM users
    WHERE phone = ?
  `;
  
  return await db.queryOne(sql, [phone]);
}

/**
 * Update user
 */
async function updateUser(userId, updates) {
  const allowedFields = ['full_name', 'email'];
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (fields.length === 0) {
    return false;
  }
  
  values.push(userId);
  
  const sql = `
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `;
  
  await db.query(sql, values);
  return true;
}

/**
 * Check if phone exists
 */
async function phoneExists(phone, excludeUserId = null) {
  let sql = `
    SELECT COUNT(*) as count
    FROM users
    WHERE phone = ?
  `;
  
  const params = [phone];
  
  if (excludeUserId) {
    sql += ' AND id != ?';
    params.push(excludeUserId);
  }
  
  const result = await db.queryOne(sql, params);
  return result.count > 0;
}

/**
 * Check if email exists
 */
async function emailExists(email, excludeUserId = null) {
  if (!email) return false;
  
  let sql = `
    SELECT COUNT(*) as count
    FROM users
    WHERE email = ?
  `;
  
  const params = [email];
  
  if (excludeUserId) {
    sql += ' AND id != ?';
    params.push(excludeUserId);
  }
  
  const result = await db.queryOne(sql, params);
  return result.count > 0;
}

module.exports = {
  createUser,
  findById,
  findByPhone,
  updateUser,
  phoneExists,
  emailExists,
};
