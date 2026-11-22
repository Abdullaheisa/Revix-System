-- 020: Repair any purchase orders prematurely marked 'completed' when received_count < quantity

UPDATE purchase_orders po
SET status = CASE
      WHEN COALESCE(agg.total_rcv, 0) > 0 THEN 'partially_received'
      ELSE 'approved'
    END,
    updated_at = NOW()
FROM (
  SELECT purchase_order_id,
         SUM(quantity)::int AS total_qty,
         SUM(received_count)::int AS total_rcv
  FROM purchase_order_items
  GROUP BY purchase_order_id
) agg
WHERE po.id = agg.purchase_order_id
  AND po.status = 'completed'
  AND agg.total_rcv < agg.total_qty;
