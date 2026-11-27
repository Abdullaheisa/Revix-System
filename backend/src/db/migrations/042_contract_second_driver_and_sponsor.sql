ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS second_driver_name TEXT,
  ADD COLUMN IF NOT EXISTS second_driver_license_no TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_national_id TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_phone TEXT,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
