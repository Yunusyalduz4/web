-- ================================================
-- COMPLETE DATABASE SCHEMA FOR RANDEVUO PROJECT
-- Database: postgresql://postgres:Test123.@37.148.209.253:5432/kuafor
-- Extracted on: $(date)
-- ================================================

-- ================================================
-- TABLES CREATION
-- ================================================

-- Users table - Core user management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    phone TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    business_id UUID REFERENCES businesses(id),
    employee_id UUID REFERENCES employees(id),
    is_employee_active BOOLEAN DEFAULT true,
    profile_image_url TEXT
);

-- Businesses table - Business information
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    profile_image_url TEXT,
    gender_preference TEXT NOT NULL DEFAULT 'both',
    working_hours_enabled BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    average_rating NUMERIC DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    gender_service VARCHAR DEFAULT 'unisex',
    is_approved BOOLEAN DEFAULT false,
    profile_image_approved BOOLEAN DEFAULT false,
    approval_note TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    instagram_url TEXT,
    facebook_url TEXT,
    tiktok_url TEXT,
    x_url TEXT
);

-- Employees table - Employee information
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID REFERENCES users(id),
    login_email VARCHAR UNIQUE,
    password_hash VARCHAR,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{"can_view_analytics": true, "can_manage_services": false, "can_manage_appointments": true}',
    created_by_user_id UUID REFERENCES users(id),
    profile_image_url TEXT
);

-- Services table - Business services
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    category_id UUID REFERENCES service_categories(id)
);

-- Service categories table
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointments table - Main appointment booking
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    business_id UUID NOT NULL REFERENCES businesses(id),
    appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    customer_name TEXT,
    customer_phone TEXT,
    is_manual BOOLEAN DEFAULT false,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    employee_id UUID REFERENCES employees(id),
    reschedule_status TEXT DEFAULT 'none'
);

-- Appointment services table - Services within appointments
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    service_id UUID NOT NULL REFERENCES services(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    price NUMERIC NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Appointment notes table
CREATE TABLE appointment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    note TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointment reschedule requests table
CREATE TABLE appointment_reschedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    requested_by_role TEXT NOT NULL,
    old_appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    old_employee_id UUID REFERENCES employees(id),
    new_appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    new_employee_id UUID REFERENCES employees(id),
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    request_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    business_id UUID NOT NULL REFERENCES businesses(id),
    service_rating INTEGER NOT NULL,
    employee_rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    photos TEXT[] NOT NULL DEFAULT '{}',
    business_reply TEXT,
    business_reply_at TIMESTAMP WITHOUT TIME ZONE,
    is_approved BOOLEAN DEFAULT false,
    business_reply_approved BOOLEAN DEFAULT false,
    approval_note TEXT,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

-- Business ratings table - Aggregated ratings
CREATE TABLE business_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES businesses(id),
    average_service_rating NUMERIC NOT NULL DEFAULT 0,
    average_employee_rating NUMERIC NOT NULL DEFAULT 0,
    overall_rating NUMERIC NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    last_6_months_rating NUMERIC NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee ratings table - Aggregated employee ratings
CREATE TABLE employee_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL UNIQUE REFERENCES employees(id),
    average_rating NUMERIC NOT NULL DEFAULT 0,
    total_reviews INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee services table - Services an employee can provide
CREATE TABLE employee_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    service_id UUID NOT NULL REFERENCES services(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, service_id)
);

-- Employee availability table
CREATE TABLE employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    day_of_week INTEGER NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business working hours table
CREATE TABLE business_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    day_of_week INTEGER NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    is_working_day BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business availability table
CREATE TABLE business_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    day_of_week VARCHAR NOT NULL,
    start_time VARCHAR NOT NULL,
    end_time VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business categories table
CREATE TABLE business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business category mapping table
CREATE TABLE business_category_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    category_id UUID NOT NULL REFERENCES business_categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, category_id)
);

-- Business images table
CREATE TABLE business_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    image_url TEXT NOT NULL,
    image_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_approved BOOLEAN DEFAULT false,
    approval_note TEXT,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

-- Business photos table
CREATE TABLE business_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Favorites table - User's favorite businesses
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    business_id UUID NOT NULL REFERENCES businesses(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, business_id)
);

-- Customer preferences table
CREATE TABLE customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    preferred_gender TEXT,
    max_distance_km INTEGER DEFAULT 10,
    preferred_services TEXT[],
    notification_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    type VARCHAR DEFAULT 'system'
);

-- Push subscriptions table - For business notifications
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(business_id, endpoint)
);

-- User push subscriptions table - For user notifications
CREATE TABLE user_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- Email tokens table - For email verification, password reset
CREATE TABLE email_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    new_email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, type, token)
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business analytics table
CREATE TABLE business_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    date DATE NOT NULL,
    total_appointments INTEGER NOT NULL DEFAULT 0,
    completed_appointments INTEGER NOT NULL DEFAULT 0,
    cancelled_appointments INTEGER NOT NULL DEFAULT 0,
    total_revenue NUMERIC NOT NULL DEFAULT 0,
    total_customers INTEGER NOT NULL DEFAULT 0,
    average_rating NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, date)
);

-- Employee permissions table
CREATE TABLE employee_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    permission_name VARCHAR NOT NULL,
    is_granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, permission_name)
);

-- Employee login logs table
CREATE TABLE employee_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    login_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    login_successful BOOLEAN DEFAULT true
);

-- ================================================
-- STORY SYSTEM TABLES
-- ================================================

-- Stories table - Instagram-like stories for businesses
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    media_url TEXT NOT NULL,
    media_type VARCHAR NOT NULL,
    media_size INTEGER,
    media_duration INTEGER,
    caption TEXT,
    background_color VARCHAR DEFAULT '#000000',
    text_color VARCHAR DEFAULT '#FFFFFF',
    font_family VARCHAR DEFAULT 'Arial',
    font_size INTEGER DEFAULT 16,
    text_position VARCHAR DEFAULT 'center',
    filter_type VARCHAR DEFAULT 'none',
    is_highlighted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Story archive table - Archived stories
CREATE TABLE story_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_story_id UUID NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id),
    media_url TEXT NOT NULL,
    media_type VARCHAR NOT NULL,
    caption TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    archive_reason VARCHAR NOT NULL
);

-- Story comments table
CREATE TABLE story_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT true,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Story likes table
CREATE TABLE story_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    liked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(story_id, user_id)
);

-- Story shares table
CREATE TABLE story_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    share_type VARCHAR NOT NULL,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    external_platform VARCHAR,
    share_message TEXT
);

-- Story views table
CREATE TABLE story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    view_duration INTEGER,
    device_type VARCHAR,
    ip_address INET,
    user_agent TEXT,
    UNIQUE(story_id, user_id)
);

-- Story hashtags table
CREATE TABLE story_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    hashtag VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(story_id, hashtag)
);

-- Story mentions table
CREATE TABLE story_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    mentioned_user_id UUID NOT NULL REFERENCES users(id),
    mentioned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(story_id, mentioned_user_id)
);

-- Story reports table
CREATE TABLE story_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id),
    reporter_user_id UUID NOT NULL REFERENCES users(id),
    report_reason VARCHAR NOT NULL,
    report_description TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(story_id, reporter_user_id)
);

-- Story daily stats table
CREATE TABLE story_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    story_date DATE NOT NULL,
    total_stories INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    avg_view_duration NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(business_id, story_date)
);

-- Support tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================
-- INDEXES
-- ================================================

-- User indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_business_id ON users(business_id);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_is_employee_active ON users(is_employee_active);

-- Business indexes
CREATE INDEX idx_businesses_owner_user_id ON businesses(owner_user_id);

-- Employee indexes
CREATE INDEX idx_employees_business_id ON employees(business_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_created_by ON employees(created_by_user_id);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_login_email ON employees(login_email);

-- Service indexes
CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_services_category_id ON services(category_id);

-- Appointment indexes
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_reschedule_status ON appointments(reschedule_status);

-- Appointment services indexes
CREATE INDEX idx_appointment_services_employee_id ON appointment_services(employee_id);

-- Appointment notes indexes
CREATE INDEX idx_appointment_notes_appointment_id ON appointment_notes(appointment_id);

-- Appointment reschedule request indexes
CREATE INDEX idx_appointment_reschedule_requests_appointment_id ON appointment_reschedule_requests(appointment_id);
CREATE INDEX idx_appointment_reschedule_requests_requested_by ON appointment_reschedule_requests(requested_by_user_id);
CREATE INDEX idx_appointment_reschedule_requests_status ON appointment_reschedule_requests(status);
CREATE INDEX idx_appointment_reschedule_requests_created_at ON appointment_reschedule_requests(created_at);

-- Review indexes
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_business_id ON reviews(business_id);
CREATE INDEX idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Business rating indexes
CREATE INDEX idx_business_ratings_business_id ON business_ratings(business_id);

-- Employee rating indexes
CREATE INDEX idx_employee_ratings_employee_id ON employee_ratings(employee_id);

-- Employee availability indexes
CREATE INDEX idx_employee_availability_employee_id ON employee_availability(employee_id);
CREATE INDEX idx_employee_availability_day ON employee_availability(day_of_week);

-- Business working hours indexes
CREATE INDEX idx_business_working_hours_business_id ON business_working_hours(business_id);

-- Business category mapping indexes
CREATE INDEX idx_business_category_mapping_business_id ON business_category_mapping(business_id);
CREATE INDEX idx_business_category_mapping_category_id ON business_category_mapping(category_id);

-- Business image indexes
CREATE INDEX idx_business_images_business_id ON business_images(business_id);

-- Favorites indexes
-- (Unique constraint already covers this)

-- Customer preferences indexes
CREATE INDEX idx_customer_preferences_user_id ON customer_preferences(user_id);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Email token indexes
CREATE INDEX idx_email_tokens_user_id ON email_tokens(user_id);
CREATE INDEX idx_email_tokens_token ON email_tokens(token);
CREATE INDEX idx_email_tokens_type ON email_tokens(type);
CREATE INDEX idx_email_tokens_expires_at ON email_tokens(expires_at);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Business analytics indexes
CREATE INDEX idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX idx_business_analytics_date ON business_analytics(date);

-- Employee permission indexes
CREATE INDEX idx_employee_permissions_employee_id ON employee_permissions(employee_id);
CREATE INDEX idx_employee_permissions_name ON employee_permissions(permission_name);

-- Employee login log indexes
CREATE INDEX idx_employee_login_logs_employee_id ON employee_login_logs(employee_id);
CREATE INDEX idx_employee_login_logs_login_at ON employee_login_logs(login_at);

-- User push subscription indexes
CREATE INDEX idx_user_push_subscriptions_user_id ON user_push_subscriptions(user_id);

-- Story indexes
CREATE INDEX idx_stories_business_id ON stories(business_id);
CREATE INDEX idx_stories_is_active ON stories(is_active);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_stories_media_type ON stories(media_type);
CREATE INDEX idx_stories_is_highlighted ON stories(is_highlighted);
CREATE INDEX idx_stories_business_active ON stories(business_id, is_active);

-- Story archive indexes
CREATE INDEX idx_story_archive_business_id ON story_archive(business_id);
CREATE INDEX idx_story_archive_archived_at ON story_archive(archived_at DESC);
CREATE INDEX idx_story_archive_archive_reason ON story_archive(archive_reason);

-- Story comment indexes
CREATE INDEX idx_story_comments_story_id ON story_comments(story_id);
CREATE INDEX idx_story_comments_user_id ON story_comments(user_id);
CREATE INDEX idx_story_comments_is_approved ON story_comments(is_approved);
CREATE INDEX idx_story_comments_created_at ON story_comments(created_at DESC);

-- Story like indexes
CREATE INDEX idx_story_likes_story_id ON story_likes(story_id);
CREATE INDEX idx_story_likes_user_id ON story_likes(user_id);
CREATE INDEX idx_story_likes_story_user ON story_likes(story_id, user_id);

-- Story share indexes
CREATE INDEX idx_story_shares_story_id ON story_shares(story_id);
CREATE INDEX idx_story_shares_user_id ON story_shares(user_id);
CREATE INDEX idx_story_shares_shared_at ON story_shares(shared_at DESC);

-- Story view indexes
CREATE INDEX idx_story_views_story_id ON story_views(story_id);
CREATE INDEX idx_story_views_user_id ON story_views(user_id);
CREATE INDEX idx_story_views_story_user ON story_views(story_id, user_id);
CREATE INDEX idx_story_views_viewed_at ON story_views(viewed_at DESC);

-- Story hashtag indexes
CREATE INDEX idx_story_hashtags_story_id ON story_hashtags(story_id);
CREATE INDEX idx_story_hashtags_hashtag ON story_hashtags(hashtag);
CREATE INDEX idx_story_hashtags_hashtag_lower ON story_hashtags(lower(hashtag));

-- Story mention indexes
CREATE INDEX idx_story_mentions_story_id ON story_mentions(story_id);
CREATE INDEX idx_story_mentions_mentioned_user ON story_mentions(mentioned_user_id);

-- Story report indexes
CREATE INDEX idx_story_reports_story_id ON story_reports(story_id);
CREATE INDEX idx_story_reports_reporter ON story_reports(reporter_user_id);
CREATE INDEX idx_story_reports_is_resolved ON story_reports(is_resolved);

-- Story daily stats indexes
CREATE INDEX idx_story_daily_stats_business_id ON story_daily_stats(business_id);
CREATE INDEX idx_story_daily_stats_story_date ON story_daily_stats(story_date DESC);
CREATE INDEX idx_story_daily_stats_business_date ON story_daily_stats(business_id, story_date);

-- ================================================
-- FOREIGN KEY CONSTRAINTS
-- ================================================

-- Note: All foreign key constraints are already defined in the table creation statements above
-- This section is for reference only

-- ================================================
-- UNIQUE CONSTRAINTS
-- ================================================

-- Note: All unique constraints are already defined in the table creation statements above
-- This section is for reference only

-- ================================================
-- EXTENSIONS (if needed)
-- ================================================

-- Enable UUID extension if not already enabled
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- VIEWS (if any exist)
-- ================================================

-- No custom views found in the database

-- ================================================
-- FUNCTIONS AND TRIGGERS (if any exist)
-- ================================================

-- No custom functions or triggers found in the database

-- ================================================
-- SCHEMA SUMMARY
-- ================================================

-- Total Tables: 41
-- Core Tables: users, businesses, employees, services, appointments
-- Story System: 10 tables (stories, story_*, etc.)
-- Analytics: business_analytics, audit_logs
-- Notifications: notifications, push_subscriptions, user_push_subscriptions
-- Support: support_tickets, email_tokens
-- Relationships: Various junction tables for many-to-many relationships

-- Key Features:
-- 1. Multi-role user system (customers, business owners, employees)
-- 2. Complete appointment booking system with rescheduling
-- 3. Rating and review system for businesses and employees
-- 4. Story system similar to Instagram Stories
-- 5. Push notification support
-- 6. Business analytics and reporting
-- 7. Employee management with permissions
-- 8. Support ticket system
-- 9. Email token system for verification/reset
-- 10. Comprehensive audit logging
