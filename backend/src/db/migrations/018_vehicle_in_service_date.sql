-- Track exact in-service / asset receiving date for Finance Depreciation calculations

ALTER TABLE fleet_vehicles
  ADD COLUMN IF NOT EXISTS in_service_date DATE DEFAULT CURRENT_DATE;
