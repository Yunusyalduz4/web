-- Migration: Add new columns to users table for enhanced registration
-- Run this script to update your existing database

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Allow admin role
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check CHECK (role IN ('user','business','admin'));

-- Email verification support
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pending_email TEXT;

-- Token table for email verification, password reset, email change
CREATE TABLE IF NOT EXISTS email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verify','reset','email_change')),
  new_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);

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