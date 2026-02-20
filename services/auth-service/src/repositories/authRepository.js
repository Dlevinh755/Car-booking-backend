/**
 * Auth Repository
 * Database operations for authentication
 */

const db = require('../../../shared/db');
const { generateUUID } = require('../../../shared/utils/uuid');
const bcrypt = require('bcrypt');

/**
 * Create auth account
 */
async function createAccount(userId, identifier, password, role = 'user') {
  const id = generateUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  
  const sql = `
    INSERT INTO auth_accounts (id, user_id, identifier, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `;
  
  await db.query(sql, [id, userId, identifier, passwordHash, role]);
  return id;
}

/**
 * Find account by identifier
 */
async function findByIdentifier(identifier) {
  const sql = `
    SELECT id, user_id, identifier, password_hash, role, status, created_at
    FROM auth_accounts
    WHERE identifier = ? AND status = 'active'
  `;
  
  return await db.queryOne(sql, [identifier]);
}

/**
 * Find account by user_id
 */
async function findByUserId(userId) {
  const sql = `
    SELECT id, user_id, identifier, role, status, created_at
    FROM auth_accounts
    WHERE user_id = ? AND status = 'active'
  `;
  
  return await db.queryOne(sql, [userId]);
}

/**
 * Verify password
 */
async function verifyPassword(plainPassword, passwordHash) {
  return await bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Create refresh token
 */
async function createRefreshToken(accountId, jti, expiresAt) {
  const id = generateUUID();
  const tokenHash = generateUUID(); // In production, hash the actual token
  
  const sql = `
    INSERT INTO auth_refresh_tokens (id, account_id, token_hash, jti, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  await db.query(sql, [id, accountId, tokenHash, jti, expiresAt]);
  return { id, tokenHash };
}

/**
 * Find refresh token by jti
 */
async function findRefreshTokenByJti(jti) {
  const sql = `
    SELECT id, account_id, token_hash, jti, expires_at, revoked_at
    FROM auth_refresh_tokens
    WHERE jti = ?
  `;
  
  return await db.queryOne(sql, [jti]);
}

/**
 * Find refresh token by token hash
 */
async function findRefreshTokenByHash(tokenHash) {
  const sql = `
    SELECT id, account_id, token_hash, jti, expires_at, revoked_at
    FROM auth_refresh_tokens
    WHERE token_hash = ?
  `;
  
  return await db.queryOne(sql, [tokenHash]);
}

/**
 * Revoke refresh token
 */
async function revokeRefreshToken(jti) {
  const sql = `
    UPDATE auth_refresh_tokens
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE jti = ?
  `;
  
  await db.query(sql, [jti]);
}

/**
 * Delete expired refresh tokens
 */
async function deleteExpiredTokens() {
  const sql = `
    DELETE FROM auth_refresh_tokens
    WHERE expires_at < CURRENT_TIMESTAMP
  `;
  
  const result = await db.query(sql);
  return result.affectedRows;
}

module.exports = {
  createAccount,
  findByIdentifier,
  findByUserId,
  verifyPassword,
  createRefreshToken,
  findRefreshTokenByJti,
  findRefreshTokenByHash,
  revokeRefreshToken,
  deleteExpiredTokens,
};
