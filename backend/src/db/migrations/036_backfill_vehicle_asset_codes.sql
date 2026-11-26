-- ==============================================================================
-- 036_backfill_vehicle_asset_codes.sql
-- Ensure every fleet_vehicles row has a unique sequential Asset ID (VEH-0001...)
-- independent of its license plate.
-- ==============================================================================

WITH existing_max AS (
  SELECT
    company_id,
    COALESCE(MAX(CAST(SUBSTRING(asset_code FROM '^VEH-([0-9]+)$') AS INTEGER)), 0) AS max_seq
  FROM fleet_vehicles
  GROUP BY company_id
),
needs_code AS (
  SELECT
    fv.id,
    fv.company_id,
    ROW_NUMBER() OVER (PARTITION BY fv.company_id ORDER BY fv.created_at ASC, fv.id ASC) AS rn
  FROM fleet_vehicles fv
  WHERE fv.asset_code IS NULL OR fv.asset_code !~ '^VEH-[0-9]+$'
)
UPDATE fleet_vehicles fv
SET asset_code = 'VEH-' || LPAD((COALESCE(em.max_seq, 0) + nc.rn)::text, 4, '0')
FROM needs_code nc
LEFT JOIN existing_max em ON em.company_id = nc.company_id
WHERE fv.id = nc.id;
