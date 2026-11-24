WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC, id ASC) AS seq
  FROM fleet_vehicles
)
UPDATE fleet_vehicles fv
SET asset_code = 'VEH-' || LPAD(ranked.seq::text, 4, '0')
FROM ranked
WHERE fv.id = ranked.id
  AND (fv.asset_code IS NULL OR fv.asset_code !~ '^VEH-[0-9]+$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_fleet_vehicles_company_asset_code
  ON fleet_vehicles (company_id, asset_code);
