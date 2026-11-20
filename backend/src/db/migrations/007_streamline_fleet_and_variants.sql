-- ==============================================================================
-- 007_streamline_fleet_and_variants.sql
-- Revix System Phase 5 Cleanup: Streamline Vehicle Variants & Fleet Schema
-- Purges rental rates and color from vehicle_variants catalog templates,
-- and removes rental rate overrides from physical fleet vehicle assets.
-- ==============================================================================

-- 1. Streamline vehicle_variants: purely catalog specifications
ALTER TABLE vehicle_variants DROP COLUMN IF EXISTS daily_rate_1_to_2;
ALTER TABLE vehicle_variants DROP COLUMN IF EXISTS daily_rate_3_to_7;
ALTER TABLE vehicle_variants DROP COLUMN IF EXISTS daily_rate_8_plus;
ALTER TABLE vehicle_variants DROP COLUMN IF EXISTS currency;
ALTER TABLE vehicle_variants DROP COLUMN IF EXISTS color;

-- 2. Streamline fleet_vehicles: purely physical fleet asset tracking
ALTER TABLE fleet_vehicles DROP COLUMN IF EXISTS daily_rate_override;
