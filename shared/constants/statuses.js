/**
 * Status constants for the application
 * Centralized status definitions for consistency across services
 */

const BOOKING_STATUS = {
  REQUESTED: 'requested',
  SEARCHING: 'searching',
  ASSIGNED: 'assigned',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
};

const RIDE_STATUS = {
  CREATED: 'created',
  ACCEPTED: 'accepted',
  ARRIVED: 'arrived',
  PICKED_UP: 'picked_up',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const DRIVER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
};

const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
};

const USER_ROLE = {
  USER: 'user',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

const PAYMENT_METHOD_TYPE = {
  CASH: 'cash',
  CARD: 'card',
  WALLET: 'wallet',
  VNPAY: 'vnpay',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
};

module.exports = {
  BOOKING_STATUS,
  RIDE_STATUS,
  PAYMENT_STATUS,
  DRIVER_STATUS,
  ACCOUNT_STATUS,
  USER_ROLE,
  PAYMENT_METHOD_TYPE,
  HTTP_STATUS,
  ERROR_CODES,
};
