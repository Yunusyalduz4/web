-- ================================================
-- DATABASE MIGRATION FOR GOOGLE PLACES INTEGRATION
-- ================================================

-- Add Google Places specific fields to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_rating NUMERIC,
ADD COLUMN IF NOT EXISTS google_reviews_count INTEGER,
ADD COLUMN IF NOT EXISTS google_photos JSONB,
ADD COLUMN IF NOT EXISTS place_types TEXT[],
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS data_source VARCHAR DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS google_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_google_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_business_status VARCHAR DEFAULT 'OPERATIONAL';

-- Add index for Google Place ID
CREATE INDEX IF NOT EXISTS idx_businesses_google_place_id ON businesses(google_place_id);

-- Add index for data source
CREATE INDEX IF NOT EXISTS idx_businesses_data_source ON businesses(data_source);

-- Add index for Google verification status
CREATE INDEX IF NOT EXISTS idx_businesses_google_verified ON businesses(is_google_verified);

-- Create Google Places cache table for temporary data storage
CREATE TABLE IF NOT EXISTS google_places_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT NOT NULL UNIQUE,
    business_name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    website TEXT,
    rating NUMERIC,
    reviews_count INTEGER,
    place_types TEXT[],
    photos JSONB,
    business_status VARCHAR,
    opening_hours JSONB,
    price_level INTEGER,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Add indexes for cache table
CREATE INDEX IF NOT EXISTS idx_google_places_cache_place_id ON google_places_cache(place_id);
CREATE INDEX IF NOT EXISTS idx_google_places_cache_expires_at ON google_places_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_google_places_cache_location ON google_places_cache(latitude, longitude);

-- Create business verification requests table
CREATE TABLE IF NOT EXISTS business_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    requested_by_user_id UUID REFERENCES users(id),
    verification_type VARCHAR NOT NULL DEFAULT 'google_places',
    status VARCHAR NOT NULL DEFAULT 'pending',
    google_place_id TEXT,
    verification_data JSONB,
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for verification requests
CREATE INDEX IF NOT EXISTS idx_business_verification_requests_business_id ON business_verification_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_business_verification_requests_status ON business_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_business_verification_requests_created_at ON business_verification_requests(created_at);

-- Create Google Places search logs table
CREATE TABLE IF NOT EXISTS google_places_search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    radius INTEGER,
    place_type VARCHAR,
    results_count INTEGER,
    api_response_time_ms INTEGER,
    search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_agent TEXT,
    ip_address INET
);

-- Add indexes for search logs
CREATE INDEX IF NOT EXISTS idx_google_places_search_logs_timestamp ON google_places_search_logs(search_timestamp);
CREATE INDEX IF NOT EXISTS idx_google_places_search_logs_location ON google_places_search_logs(location_lat, location_lng);

-- Update business_categories with Google Places types
INSERT INTO business_categories (name, description, icon) VALUES 
('Beauty Salon', 'Güzellik salonu - makyaj, cilt bakımı', 'beauty'),
('Hair Salon', 'Kuaför - saç kesimi, boyama, şekillendirme', 'hair'),
('Barber Shop', 'Berber - erkek saç kesimi, sakal tıraşı', 'barber'),
('Nail Salon', 'Tırnak salonu - manikür, pedikür', 'nails'),
('Spa', 'Spa merkezi - masaj, güzellik tedavileri', 'spa'),
('Hair Removal', 'Epilasyon merkezi - lazer, wax', 'hair-removal'),
('Eyebrow Studio', 'Kaş tasarımı ve bakımı', 'eyebrow'),
('Eyelash Studio', 'Kirpik uzatma ve bakımı', 'eyelash'),
('Tattoo Studio', 'Dövme ve piercing', 'tattoo'),
('Aesthetics Clinic', 'Estetik klinik - botoks, dolgu', 'aesthetics')
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically categorize businesses based on Google Places types
CREATE OR REPLACE FUNCTION categorize_business_from_google_types(place_types TEXT[])
RETURNS UUID AS $$
DECLARE
    category_id UUID;
    place_type TEXT;
BEGIN
    -- Loop through place types and find matching category
    FOREACH place_type IN ARRAY place_types
    LOOP
        CASE 
            WHEN place_type IN ('beauty_salon', 'spa') THEN
                SELECT id INTO category_id FROM business_categories WHERE name = 'Beauty Salon';
            WHEN place_type IN ('hair_care', 'hair_salon') THEN
                SELECT id INTO category_id FROM business_categories WHERE name = 'Hair Salon';
            WHEN place_type = 'barber' THEN
                SELECT id INTO category_id FROM business_categories WHERE name = 'Barber Shop';
            WHEN place_type = 'nail_salon' THEN
                SELECT id INTO category_id FROM business_categories WHERE name = 'Nail Salon';
            WHEN place_type = 'spa' THEN
                SELECT id INTO category_id FROM business_categories WHERE name = 'Spa';
            ELSE
                -- Default to Beauty Salon if no specific match
                SELECT id INTO category_id FROM business_categories WHERE name = 'Beauty Salon';
        END CASE;
        
        -- Return first match found
        IF category_id IS NOT NULL THEN
            RETURN category_id;
        END IF;
    END LOOP;
    
    -- Default fallback
    SELECT id INTO category_id FROM business_categories WHERE name = 'Beauty Salon';
    RETURN category_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_google_places_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM google_places_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update google_updated_at when Google data changes
CREATE OR REPLACE FUNCTION update_google_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.google_place_id IS DISTINCT FROM NEW.google_place_id OR
       OLD.google_rating IS DISTINCT FROM NEW.google_rating OR
       OLD.google_reviews_count IS DISTINCT FROM NEW.google_reviews_count OR
       OLD.google_photos IS DISTINCT FROM NEW.google_photos OR
       OLD.place_types IS DISTINCT FROM NEW.place_types THEN
        NEW.google_updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_google_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_google_updated_at();

-- Add comments for documentation
COMMENT ON COLUMN businesses.google_place_id IS 'Google Places unique identifier';
COMMENT ON COLUMN businesses.google_rating IS 'Google Places rating (1-5)';
COMMENT ON COLUMN businesses.google_reviews_count IS 'Number of Google reviews';
COMMENT ON COLUMN businesses.google_photos IS 'Google Places photos metadata';
COMMENT ON COLUMN businesses.place_types IS 'Google Places business types';
COMMENT ON COLUMN businesses.data_source IS 'Source of business data: manual, google_places, import';
COMMENT ON COLUMN businesses.is_google_verified IS 'Whether business is verified on Google Places';
COMMENT ON COLUMN businesses.google_business_status IS 'Google business status: OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY';

COMMENT ON TABLE google_places_cache IS 'Temporary cache for Google Places API responses';
COMMENT ON TABLE business_verification_requests IS 'Business verification requests from Google Places';
COMMENT ON TABLE google_places_search_logs IS 'Logs of Google Places API searches for monitoring';
