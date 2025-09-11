-- Randevu erteleme istekleri tablosu
CREATE TABLE IF NOT EXISTS appointment_reschedule_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    requested_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_role TEXT NOT NULL CHECK (requested_by_role IN ('user', 'business', 'employee')),
    
    -- Eski tarih bilgileri
    old_appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    old_employee_id INTEGER REFERENCES employees(id),
    
    -- Yeni tarih bilgileri
    new_appointment_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    new_employee_id INTEGER REFERENCES employees(id),
    
    -- Onay durumu
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Onaylayan bilgileri
    approved_by_user_id INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- İstek detayları
    request_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_appointment_id 
    ON appointment_reschedule_requests(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_requested_by 
    ON appointment_reschedule_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_status 
    ON appointment_reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_appointment_reschedule_requests_created_at 
    ON appointment_reschedule_requests(created_at);

-- Appointments tablosuna reschedule durumu ekle
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reschedule_status TEXT DEFAULT 'none' 
CHECK (reschedule_status IN ('none', 'pending', 'approved', 'rejected'));

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_appointments_reschedule_status 
    ON appointments(reschedule_status);
