-- 024: Unassign branch_id for PO-received vehicles that have not yet been transferred & received by a branch

UPDATE fleet_vehicles fv
SET branch_id = NULL,
    updated_at = NOW()
WHERE fv.purchase_order_id IS NOT NULL
  AND fv.branch_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM vehicle_movements vm
    WHERE vm.vehicle_id = fv.id
      AND vm.status = 'received'
  );
