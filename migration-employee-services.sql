-- EMPLOYEE SERVICES (Çalışan-Hizmet İlişkisi)
CREATE TABLE employee_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, service_id) -- Bir çalışan aynı hizmete birden fazla kez atanamaz
);
CREATE INDEX idx_employee_services_employee_id ON employee_services(employee_id);
CREATE INDEX idx_employee_services_service_id ON employee_services(service_id);

-- APPOINTMENT SERVICES (Randevu-Hizmet İlişkisi - Çoklu Hizmet İçin)
CREATE TABLE appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL, -- Hizmetin o anki fiyatı (değişebilir)
    duration_minutes INTEGER NOT NULL, -- Hizmetin o anki süresi (değişebilir)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointment_services_appointment_id ON appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service_id ON appointment_services(service_id);
CREATE INDEX idx_appointment_services_employee_id ON appointment_services(employee_id);

-- APPOINTMENTS tablosunu güncelle (service_id ve employee_id kaldırılacak)
-- Önce yeni tabloları oluştur, sonra eski verileri taşı, sonra eski kolonları kaldır

-- 1. Mevcut randevuları yeni sisteme taşı
INSERT INTO appointment_services (appointment_id, service_id, employee_id, price, duration_minutes)
SELECT 
    a.id as appointment_id,
    a.service_id,
    a.employee_id,
    s.price,
    s.duration_minutes
FROM appointments a
JOIN services s ON a.service_id = s.id;

-- 2. APPOINTMENTS tablosundan service_id ve employee_id kolonlarını kaldır
ALTER TABLE appointments DROP COLUMN service_id;
ALTER TABLE appointments DROP COLUMN employee_id;
