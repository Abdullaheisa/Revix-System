-- ==============================================================================
-- 039_vehicle_security_deposit.sql
-- Add refundable security_deposit column to fleet_vehicles and vehicle_variants.
-- ==============================================================================

ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12, 2) DEFAULT 0.00;
