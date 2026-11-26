-- ==============================================================================
-- 035_variant_default_pricing.sql
-- Store default tier pricing and photo on vehicle_variants so newly created
-- or PO-received vehicles inherit pricing even before any sibling vehicle exists.
-- ==============================================================================

ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS daily_rate_1_to_2 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS daily_rate_3_to_7 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS daily_rate_8_plus NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS damage_excess NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS photo_url TEXT;
