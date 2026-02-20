-- ============================================================
-- INIT.SQL - MVP Taxi Microservices (MySQL 8.0)
-- - Creates databases per service
-- - Grants privileges to 'my_user'@'%'
-- - Creates minimal tables for: auth, user, driver, booking, ride, pricing, payment
-- - Pricing supports distance-based fare using Haversine distance * route_factor
-- ============================================================

-- -------------------------
-- 00 - CREATE DATABASES
-- -------------------------
CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS user_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS driver_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS booking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS ride_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS pricing_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS payment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges to app user from docker-compose
GRANT ALL PRIVILEGES ON auth_db.*    TO 'my_user'@'%';
GRANT ALL PRIVILEGES ON user_db.*    TO 'my_user'@'%';
GRANT ALL PRIVILEGES ON driver_db.*  TO 'my_user'@'%';
GRANT ALL PRIVILEGES ON booking_db.* TO 'my_user'@'%';
GRANT ALL PRIVILEGES ON ride_db.*    TO 'my_user'@'%';
GRANT ALL PRIVILEGES ON pricing_db.* TO 'my_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'my_user'@'%';
FLUSH PRIVILEGES;

-- ============================================================
-- AUTH DB
-- ============================================================
USE auth_db;

CREATE TABLE IF NOT EXISTS auth_accounts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  identifier VARCHAR(190) NOT NULL UNIQUE, -- email/phone
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','driver','admin') NOT NULL DEFAULT 'user',
  status ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_identifier (identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id CHAR(36) PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  jti CHAR(36) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_account_id (account_id),
  INDEX idx_jti (jti),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- USER DB
-- ============================================================
USE user_db;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(190) NULL UNIQUE,
  default_payment_method_id CHAR(36) NULL,
  rating_avg DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DRIVER DB
-- ============================================================
USE driver_db;

CREATE TABLE IF NOT EXISTS drivers (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  status ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  rating_avg DECIMAL(2,1) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vehicles (
  id CHAR(36) PRIMARY KEY,
  driver_id CHAR(36) NOT NULL UNIQUE, -- MVP: 1 driver 1 vehicle
  plate_number VARCHAR(30) NOT NULL UNIQUE,
  make VARCHAR(60) NULL,
  model VARCHAR(60) NULL,
  color VARCHAR(30) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_driver_id (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS driver_presence (
  driver_id CHAR(36) PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat DECIMAL(10,7) NULL,
  current_lng DECIMAL(10,7) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_online (is_online),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PRICING DB (distance-based MVP: haversine * route_factor)
-- ============================================================
USE pricing_db;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,

  -- core fares
  base_fare BIGINT NOT NULL,
  per_km BIGINT NOT NULL,
  per_minute BIGINT NOT NULL DEFAULT 0,
  minimum_fare BIGINT NULL,
  booking_fee BIGINT NOT NULL DEFAULT 0,

  currency CHAR(3) NOT NULL DEFAULT 'VND',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- MVP distance adjustment:
  -- actual_distance_est = haversine_distance * route_factor
  route_factor DECIMAL(4,2) NOT NULL DEFAULT 1.30,

  -- rounding:
  -- rounding_km_step=1.00 means ceil to next 1km
  -- you can set 0.10 to round up per 100m (0.1km) if desired
  rounding_km_step DECIMAL(4,2) NOT NULL DEFAULT 1.00,

  -- multiplier placeholders (keep 1.0 for MVP)
  surge_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  night_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,

  -- final rounding in currency units (e.g. 100 VND)
  rounding_currency_unit INT NOT NULL DEFAULT 100,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pricing_quotes (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  rule_id CHAR(36) NOT NULL,

  -- estimation inputs
  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  dropoff_lat DECIMAL(10,7) NOT NULL,
  dropoff_lng DECIMAL(10,7) NOT NULL,

  -- raw + adjusted distance
  raw_distance_meters INT NOT NULL,          -- haversine meters
  adjusted_distance_meters INT NOT NULL,     -- raw * route_factor (rounded step if any)
  estimated_duration_seconds INT NOT NULL,   -- (optional) raw estimate

  estimated_fare_amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',

  route_factor_used DECIMAL(4,2) NOT NULL,
  rounding_km_step_used DECIMAL(4,2) NOT NULL,
  multiplier_used DECIMAL(6,3) NOT NULL DEFAULT 1.000, -- surge*night

  breakdown_json JSON NULL,

  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_booking_quote (booking_id),
  INDEX idx_rule_id (rule_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pricing_fares (
  id CHAR(36) PRIMARY KEY,
  ride_id CHAR(36) NOT NULL,
  quote_id CHAR(36) NULL,

  -- actual measures (for MVP may equal quote adjusted distance)
  actual_distance_meters INT NOT NULL,
  actual_duration_seconds INT NOT NULL,

  subtotal_amount BIGINT NOT NULL,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',

  rule_snapshot_json JSON NULL,
  breakdown_json JSON NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_ride_fare (ride_id),
  INDEX idx_quote_id (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default rule (idempotent)
INSERT INTO pricing_rules (
  id, name,
  base_fare, per_km, per_minute, minimum_fare, booking_fee,
  currency, is_active,
  route_factor, rounding_km_step,
  surge_multiplier, night_multiplier,
  rounding_currency_unit
)
VALUES (
  '00000000-0000-0000-0000-000000000001', 'Default (MVP)',
  10000, 12000, 0, 15000, 0,
  'VND', TRUE,
  1.30, 1.00,
  1.00, 1.00,
  100
)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  base_fare=VALUES(base_fare),
  per_km=VALUES(per_km),
  per_minute=VALUES(per_minute),
  minimum_fare=VALUES(minimum_fare),
  booking_fee=VALUES(booking_fee),
  route_factor=VALUES(route_factor),
  rounding_km_step=VALUES(rounding_km_step),
  surge_multiplier=VALUES(surge_multiplier),
  night_multiplier=VALUES(night_multiplier),
  rounding_currency_unit=VALUES(rounding_currency_unit),
  is_active=VALUES(is_active);

-- ============================================================
-- BOOKING DB
-- ============================================================
USE booking_db;

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,

  pickup_lat DECIMAL(10,7) NOT NULL,
  pickup_lng DECIMAL(10,7) NOT NULL,
  pickup_address_text VARCHAR(255) NULL,

  dropoff_lat DECIMAL(10,7) NOT NULL,
  dropoff_lng DECIMAL(10,7) NOT NULL,
  dropoff_address_text VARCHAR(255) NULL,

  status ENUM('requested','searching','assigned','cancelled','expired','completed') NOT NULL DEFAULT 'requested',
  assigned_driver_id CHAR(36) NULL,

  pricing_quote_id CHAR(36) NULL,
  estimated_fare_amount BIGINT NULL,  -- optional cache for fast read
  currency CHAR(3) NOT NULL DEFAULT 'VND',

  note TEXT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_created (user_id, created_at),
  INDEX idx_status (status),
  INDEX idx_assigned_driver (assigned_driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS booking_events (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- RIDE DB
-- ============================================================
USE ride_db;

CREATE TABLE IF NOT EXISTS rides (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  driver_id CHAR(36) NOT NULL,

  status ENUM('accepted','arrived','picked_up','in_progress','completed','cancelled') NOT NULL DEFAULT 'accepted',

  start_time TIMESTAMP NULL,
  end_time TIMESTAMP NULL,

  start_lat DECIMAL(10,7) NULL,
  start_lng DECIMAL(10,7) NULL,
  end_lat DECIMAL(10,7) NULL,
  end_lng DECIMAL(10,7) NULL,

  distance_meters INT NULL,
  duration_seconds INT NULL,

  final_fare_amount BIGINT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',

  fare_id CHAR(36) NULL, -- id from pricing_db.pricing_fares (logical reference)

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_booking (booking_id),
  INDEX idx_driver (driver_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ride_status_events (
  id CHAR(36) PRIMARY KEY,
  ride_id CHAR(36) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ride_id (ride_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PAYMENT DB
-- ============================================================
USE payment_db;

CREATE TABLE IF NOT EXISTS payment_methods (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('cash','card','wallet') NOT NULL,
  provider VARCHAR(30) NULL,
  provider_ref VARCHAR(190) NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  ride_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  amount BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  method_id CHAR(36) NULL,
  status ENUM('pending','authorized','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  provider VARCHAR(30) NULL,
  provider_payment_id VARCHAR(190) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ride_payment (ride_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_events (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_id (payment_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
