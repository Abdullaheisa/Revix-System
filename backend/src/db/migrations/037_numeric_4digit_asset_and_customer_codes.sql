-- ==============================================================================
-- 037_numeric_4digit_asset_and_customer_codes.sql
-- Convert fleet_vehicles.asset_code (VEH-0001 -> 0001) and
-- customers.customer_code (CUS-0001 -> 0001) to 4-digit numeric codes.
-- ==============================================================================

UPDATE fleet_vehicles
SET asset_code = SUBSTRING(asset_code FROM '^VEH-([0-9]+)$')
WHERE asset_code ~ '^VEH-[0-9]+$';

UPDATE customers
SET customer_code = SUBSTRING(customer_code FROM '^CUS-([0-9]+)$')
WHERE customer_code ~ '^CUS-[0-9]+$';
