-- 019: Employee actor tracking columns and audit log entity index

ALTER TABLE fleet_vehicles
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE vehicle_maintenance_logs
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup
  ON audit_logs (company_id, entity_type, entity_id, created_at DESC);
