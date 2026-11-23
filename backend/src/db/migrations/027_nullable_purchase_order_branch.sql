-- Purchase orders are issued at the company level, never bound to a single branch.
ALTER TABLE purchase_orders
  ALTER COLUMN branch_id DROP NOT NULL;

UPDATE purchase_orders
SET branch_id = NULL
WHERE branch_id IS NOT NULL;
