-- 021: Drivers directory and Vehicle Movements / Branch Transfers

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  license_number TEXT NOT NULL,
  license_issue_date DATE NOT NULL,
  license_expiry_date DATE NOT NULL,
  passport_number TEXT,
  address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers (company_id, full_name);

CREATE TABLE IF NOT EXISTS vehicle_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  movement_number VARCHAR(30) NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  to_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'received', 'cancelled')),
  dispatch_odometer_km INTEGER NOT NULL CHECK (dispatch_odometer_km >= 0),
  arrival_odometer_km INTEGER CHECK (arrival_odometer_km IS NULL OR arrival_odometer_km >= 0),
  dispatched_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_movements_company ON vehicle_movements (company_id, dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_movements_vehicle ON vehicle_movements (vehicle_id, dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_movements_to_branch ON vehicle_movements (to_branch_id, status);
