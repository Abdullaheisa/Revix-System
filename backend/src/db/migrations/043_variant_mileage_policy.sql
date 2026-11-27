-- ==============================================================================
-- 043_variant_mileage_policy.sql
-- Store default mileage_policy, daily_km_limit, and extra_km_rate on
-- vehicle_variants so new vehicles inherit the Price List mileage policy.
-- ==============================================================================

ALTER TABLE vehicle_variants
  ADD COLUMN IF NOT EXISTS mileage_policy TEXT DEFAULT 'unlimited',
  ADD COLUMN IF NOT EXISTS daily_km_limit INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_km_rate NUMERIC(12, 2) DEFAULT 0.00;
