-- 022: Allow fleet_vehicles.branch_id and vehicle_movements.from_branch_id to be NULL (Company Stock before branch transfer)

ALTER TABLE fleet_vehicles
  ALTER COLUMN branch_id DROP NOT NULL;

ALTER TABLE vehicle_movements
  ALTER COLUMN from_branch_id DROP NOT NULL;
