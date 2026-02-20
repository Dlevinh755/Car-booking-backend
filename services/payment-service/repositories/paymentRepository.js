const db = require('../../../../shared/db');
const { generateId } = require('../../../../shared/utils/uuid');

/**
 * Create a new payment
 * @param {Object} paymentData - Payment creation data
 * @param {string} paymentData.rideId - Ride ID
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.provider - Payment provider (vnpay)
 * @returns {Promise<Object>} Created payment
 */
async function createPayment(paymentData) {
  const paymentId = generateId();
  const now = new Date();

  const query = `
    INSERT INTO payments (
      id, ride_id, amount, provider, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `;

  await db.query(query, [
    paymentId,
    paymentData.rideId,
    paymentData.amount,
    paymentData.provider,
    now,
    now
  ]);

  // Create initial payment event
  await createPaymentEvent(paymentId, 'pending');

  return {
    id: paymentId,
    rideId: paymentData.rideId,
    amount: paymentData.amount,
    provider: paymentData.provider,
    providerPaymentId: null,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object|null>} Payment or null if not found
 */
async function getPaymentById(paymentId) {
  const query = `
    SELECT 
      id, ride_id, amount, provider, provider_payment_id, status,
      created_at, updated_at
    FROM payments
    WHERE id = ?
  `;

  const [rows] = await db.query(query, [paymentId]);
  
  if (rows.length === 0) {
    return null;
  }

  const payment = rows[0];
  return {
    id: payment.id,
    rideId: payment.ride_id,
    amount: payment.amount,
    provider: payment.provider,
    providerPaymentId: payment.provider_payment_id,
    status: payment.status,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  };
}

/**
 * Get payment by ride ID
 * @param {string} rideId - Ride ID
 * @returns {Promise<Object|null>} Payment or null if not found
 */
async function getPaymentByRideId(rideId) {
  const query = `
    SELECT 
      id, ride_id, amount, provider, provider_payment_id, status,
      created_at, updated_at
    FROM payments
    WHERE ride_id = ?
  `;

  const [rows] = await db.query(query, [rideId]);
  
  if (rows.length === 0) {
    return null;
  }

  const payment = rows[0];
  return {
    id: payment.id,
    rideId: payment.ride_id,
    amount: payment.amount,
    provider: payment.provider,
    providerPaymentId: payment.provider_payment_id,
    status: payment.status,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  };
}

/**
 * Update payment status
 * @param {string} paymentId - Payment ID
 * @param {string} newStatus - New status
 * @param {string} [providerPaymentId] - Provider payment ID
 * @returns {Promise<Object>} Updated payment
 */
async function updatePaymentStatus(paymentId, newStatus, providerPaymentId = null) {
  const updateFields = ['status = ?', 'updated_at = ?'];
  const updateValues = [newStatus, new Date()];

  if (providerPaymentId) {
    updateFields.push('provider_payment_id = ?');
    updateValues.push(providerPaymentId);
  }

  updateValues.push(paymentId);

  const query = `
    UPDATE payments
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `;

  await db.query(query, updateValues);

  // Create payment event
  await createPaymentEvent(paymentId, newStatus);

  return getPaymentById(paymentId);
}

/**
 * Create a payment event
 * @param {string} paymentId - Payment ID
 * @param {string} status - Status
 * @param {Object} [metadata] - Event metadata
 */
async function createPaymentEvent(paymentId, status, metadata = null) {
  const eventId = generateId();
  
  const query = `
    INSERT INTO payment_events (
      id, payment_id, status, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `;

  await db.query(query, [
    eventId,
    paymentId,
    status,
    metadata ? JSON.stringify(metadata) : null,
    new Date()
  ]);
}

/**
 * Get payment events
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Array>} List of payment events
 */
async function getPaymentEvents(paymentId) {
  const query = `
    SELECT id, payment_id, status, metadata, created_at
    FROM payment_events
    WHERE payment_id = ?
    ORDER BY created_at ASC
  `;

  const [rows] = await db.query(query, [paymentId]);

  return rows.map(event => ({
    id: event.id,
    paymentId: event.payment_id,
    status: event.status,
    metadata: event.metadata ? JSON.parse(event.metadata) : null,
    createdAt: event.created_at
  }));
}

module.exports = {
  createPayment,
  getPaymentById,
  getPaymentByRideId,
  updatePaymentStatus,
  createPaymentEvent,
  getPaymentEvents
};
