-- ==============================================================================
-- 016_vehicle_lifecycle_and_insurance.sql
-- Insurance Companies Directory, Vehicle Insurance Policies, Odometer Logs,
-- Maintenance Logs, and Check-in / Check-out 3D Damage Inspections.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_companies_company_name
  ON insurance_companies (company_id, LOWER(name));

CREATE TABLE IF NOT EXISTS vehicle_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  insurance_company_id UUID REFERENCES insurance_companies(id) ON DELETE SET NULL,
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  coverage_type VARCHAR(30) NOT NULL DEFAULT 'comprehensive',
  premium_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deductible_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle
  ON vehicle_insurance_policies (vehicle_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_odometer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  reference_label TEXT,
  odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
  delta_km INTEGER NOT NULL DEFAULT 0,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_odometer_vehicle
  ON vehicle_odometer_logs (vehicle_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  workshop_name TEXT,
  odometer_at_service INTEGER NOT NULL DEFAULT 0,
  next_service_km INTEGER,
  next_service_date DATE,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  notes TEXT,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle
  ON vehicle_maintenance_logs (vehicle_id, service_date DESC);

CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  inspection_type VARCHAR(30) NOT NULL DEFAULT 'checkin',
  booking_ref TEXT,
  customer_name TEXT,
  odometer_km INTEGER NOT NULL DEFAULT 0,
  has_accident BOOLEAN NOT NULL DEFAULT FALSE,
  accident_notes TEXT,
  inspected_by TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle
  ON vehicle_inspections (vehicle_id, inspected_at DESC);

CREATE TABLE IF NOT EXISTS vehicle_damage_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  zone_key VARCHAR(40) NOT NULL,
  severity VARCHAR(30) NOT NULL DEFAULT 'minor_scratch',
  description TEXT,
  repair_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_damage_vehicle
  ON vehicle_damage_points (vehicle_id, created_at DESC);
