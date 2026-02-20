/**
 * MySQL database connection pool helper
 * Provides query wrapper and connection management
 */

const mysql = require('mysql2/promise');
const config = require('./config');

let pool = null;

/**
 * Initialize database connection pool
 * @param {Object} dbConfig - Optional db config override
 * @returns {Promise<mysql.Pool>}
 */
async function initPool(dbConfig = null) {
  const poolConfig = dbConfig || config.db;
  
  pool = mysql.createPool(poolConfig);
  
  // Test connection with retry logic
  let retries = 5;
  while (retries > 0) {
    try {
      const connection = await pool.getConnection();
      console.log(`✅ Database connected: ${poolConfig.database}`);
      connection.release();
      return pool;
    } catch (error) {
      retries--;
      console.error(`❌ Database connection failed. Retries left: ${retries}`, error.message);
      if (retries === 0) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
    }
  }
}

/**
 * Get the connection pool
 * @returns {mysql.Pool}
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

/**
 * Execute a query
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute a query and return first row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} - First row or null
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Begin a transaction
 * @returns {Promise<mysql.PoolConnection>}
 */
async function beginTransaction() {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

/**
 * Commit a transaction
 * @param {mysql.PoolConnection} connection
 */
async function commit(connection) {
  await connection.commit();
  connection.release();
}

/**
 * Rollback a transaction
 * @param {mysql.PoolConnection} connection
 */
async function rollback(connection) {
  await connection.rollback();
  connection.release();
}

/**
 * Close the pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

module.exports = {
  initPool,
  getPool,
  query,
  queryOne,
  beginTransaction,
  commit,
  rollback,
  closePool,
};
