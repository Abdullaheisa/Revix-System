ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
  ADD COLUMN IF NOT EXISTS work_address TEXT;
