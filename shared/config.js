/**
 * Shared configuration loader
 * Centralizes environment variable access with defaults
 */

const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'my_user',
    password: process.env.DB_PASS || 'my_password',
    database: process.env.DB_NAME || 'mydatabase',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
  
  // Service URLs (for inter-service communication)
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
    ride: process.env.RIDE_SERVICE_URL || 'http://localhost:3004',
    driver: process.env.DRIVER_SERVICE_URL || 'http://localhost:3005',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    pricing: process.env.PRICING_SERVICE_URL || 'http://localhost:3007',
    review: process.env.REVIEW_SERVICE_URL || 'http://localhost:3008',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009',
  },
  
  // VNPay
  vnpay: {
    tmnCode: process.env.VNP_TMN_CODE || '',
    hashSecret: process.env.VNP_HASH_SECRET || '',
    url: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNP_RETURN_URL || 'http://localhost:3006/payments/vnpay/return',
    ipnUrl: process.env.VNP_IPN_URL || 'http://localhost:3006/payments/vnpay/ipn',
  },
  
  // Pricing
  pricing: {
    defaultRuleId: process.env.DEFAULT_RULE_ID || '00000000-0000-0000-0000-000000000001',
  },
};

module.exports = config;
