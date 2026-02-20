-- Migration: Add user_id to drivers table and additional vehicle fields
-- Purpose: Link driver profile with auth account and store vehicle details

USE driver_db;

-- Add user_id column to drivers table
ALTER TABLE drivers 
ADD COLUMN user_id CHAR(36) NULL AFTER id,
ADD UNIQUE KEY uq_user_id (user_id);

-- Add vehicle_type and license_number to vehicles table  
ALTER TABLE vehicles
ADD COLUMN vehicle_type ENUM('bike','4-seater','7-seater') NOT NULL DEFAULT '4-seater' AFTER driver_id,
ADD COLUMN license_number VARCHAR(50) NULL AFTER plate_number,
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER color;
