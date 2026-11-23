-- Normalize existing random references without changing purchase order IDs.
WITH valid AS (
  SELECT company_id, substring(po_number from 4 for 4) AS year,
         MAX(substring(po_number from 9)::bigint) AS highest
  FROM purchase_orders WHERE po_number ~ '^PO-[0-9]{4}-[0-9]+$'
  GROUP BY company_id, substring(po_number from 4 for 4)
), numbered AS (
  SELECT po.id, 'PO-' || to_char(po.order_date, 'YYYY') || '-' ||
    lpad((COALESCE(v.highest, 0) + row_number() OVER (
      PARTITION BY po.company_id, to_char(po.order_date, 'YYYY')
      ORDER BY po.created_at, po.id
    ))::text, 4, '0') AS reference
  FROM purchase_orders po
  LEFT JOIN valid v ON v.company_id = po.company_id AND v.year = to_char(po.order_date, 'YYYY')
  WHERE po.po_number !~ '^PO-[0-9]{4}-[0-9]+$'
)
UPDATE purchase_orders po SET po_number = n.reference
FROM numbered n WHERE n.id = po.id;
