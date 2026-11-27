-- 041_unique_asset_code_per_company.sql
-- Guarantees each vehicle within a company has a unique Asset ID (asset_code).

CREATE UNIQUE INDEX IF NOT EXISTS fleet_vehicles_company_asset_code_uidx
  ON fleet_vehicles (company_id, asset_code)
  WHERE asset_code IS NOT NULL;
