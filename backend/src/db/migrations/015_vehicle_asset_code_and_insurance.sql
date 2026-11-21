ALTER TABLE fleet_vehicles
  ADD COLUMN IF NOT EXISTS asset_code TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_type TEXT,
  ADD COLUMN IF NOT EXISTS insurance_cost NUMERIC(12, 2);

UPDATE fleet_vehicles
SET asset_code = UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 4))
WHERE asset_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fleet_vehicles_company_asset_code
  ON fleet_vehicles (company_id, asset_code);
