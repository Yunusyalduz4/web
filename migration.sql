-- Migration: Add new columns to users table for enhanced registration
-- Run this script to update your existing database

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Update existing users to have default values for new columns
UPDATE users 
SET 
  phone = COALESCE(phone, ''),
  address = COALESCE(address, ''),
  latitude = COALESCE(latitude, 41.0082),
  longitude = COALESCE(longitude, 28.9784)
WHERE phone IS NULL OR address IS NULL OR latitude IS NULL OR longitude IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.phone IS 'User phone number (for customers)';
COMMENT ON COLUMN users.address IS 'User address (for customers)';
COMMENT ON COLUMN users.latitude IS 'User location latitude (for customers)';
COMMENT ON COLUMN users.longitude IS 'User location longitude (for customers)'; 

-- Add profile image column to businesses
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;