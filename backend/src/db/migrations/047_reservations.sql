CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  return_branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
  reservation_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE RESTRICT,
  allow_similar BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'phone',
  external_booking_ref TEXT NULL,
  external_metadata JSONB NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  pickup_date DATE NOT NULL,
  pickup_time TEXT NULL,
  return_date DATE NOT NULL,
  return_time TEXT NULL,
  daily_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_days INTEGER NOT NULL DEFAULT 1,
  estimated_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  converted_contract_id UUID NULL REFERENCES rental_contracts(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID NULL REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  cancelled_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reservations_company_number UNIQUE (company_id, reservation_number)
);

CREATE INDEX IF NOT EXISTS idx_reservations_company_status
  ON reservations(company_id, status, pickup_date);

CREATE INDEX IF NOT EXISTS idx_reservations_company_variant_dates
  ON reservations(company_id, variant_id, pickup_date, return_date);

CREATE INDEX IF NOT EXISTS idx_reservations_external_ref
  ON reservations(company_id, external_booking_ref)
  WHERE external_booking_ref IS NOT NULL;

ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS reservation_id UUID NULL REFERENCES reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rental_contracts_reservation
  ON rental_contracts(reservation_id)
  WHERE reservation_id IS NOT NULL;
