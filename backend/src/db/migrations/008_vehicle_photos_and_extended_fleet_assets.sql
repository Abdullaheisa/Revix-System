-- ==============================================================================
-- 008_vehicle_photos_and_extended_fleet_assets.sql
-- Revix System Phase 5 Extended: Vehicle Photo Library & Complete Fleet Asset Registry
-- Adds vehicle photo catalog and full operational rental fields to fleet_vehicles
-- (Daily pricing tiers, damage excess, mileage policy, inclusions, specs, policies).
-- ==============================================================================

-- 1. Vehicle Photo Catalog (Verified photography library)
CREATE TABLE IF NOT EXISTS vehicle_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vehicle_name VARCHAR(120) NOT NULL,
    photo_url TEXT NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_company ON vehicle_photos(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_name ON vehicle_photos(company_id, vehicle_name);

-- 2. Extended Fleet Vehicle Asset fields
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) DEFAULT 'airport_terminal';
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS fuel_policy VARCHAR(50) DEFAULT 'full_to_full';
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS instant_confirmation BOOLEAN DEFAULT FALSE;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS delivery_policy TEXT;

ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS daily_rate_1_to_2 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS daily_rate_3_to_7 NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS daily_rate_8_plus NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS damage_excess NUMERIC(12, 2) DEFAULT 0.00;

ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS mileage_policy VARCHAR(20) DEFAULT 'unlimited';
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS daily_km_limit INTEGER DEFAULT 0;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS extra_km_rate NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS inclusions TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 5;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS doors INTEGER DEFAULT 4;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS air_conditioning BOOLEAN DEFAULT TRUE;
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(30) DEFAULT 'petrol';
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS luggage_capacity VARCHAR(50) DEFAULT '2 Bags';
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS transmission VARCHAR(20) DEFAULT 'automatic';
