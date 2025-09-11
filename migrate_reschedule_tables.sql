-- Migration script to add reschedule functionality
-- Run this script to add the missing tables and columns

-- 1. Create appointment_reschedule_requests table
CREATE TABLE IF NOT EXISTS appointment_reschedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_role TEXT NOT NULL CHECK (requested_by_role IN ('user', 'business', 'employee')),
    
    -- Eski tarih bilgileri
    old_appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    old_employee_id UUID REFERENCES employees(id),
    
    -- Yeni tarih bilgileri
    new_appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    new_employee_id UUID REFERENCES employees(id),
    
    -- Onay durumu
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Onaylayan bilgileri
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- İstek detayları
    request_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for appointment_reschedule_requests
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_appointment_id 
    ON appointment_reschedule_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_requested_by 
    ON appointment_reschedule_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_status 
    ON appointment_reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_created_at 
    ON appointment_reschedule_requests(created_at);

-- 3. Add reschedule_status column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reschedule_status TEXT DEFAULT 'none' 
CHECK (reschedule_status IN ('none', 'pending', 'approved', 'rejected'));

-- 4. Create index for reschedule_status
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_status 
    ON appointments(reschedule_status);

-- 5. Verify the changes
SELECT 'Migration completed successfully' as status;
