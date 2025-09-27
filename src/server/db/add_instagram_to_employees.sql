-- Instagram alanını employees tablosuna ekle
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_employees_instagram ON employees(instagram);
