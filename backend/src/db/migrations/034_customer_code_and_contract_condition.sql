ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_code TEXT;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC, id ASC) AS seq
  FROM customers
)
UPDATE customers c
SET customer_code = 'CUS-' || LPAD(ranked.seq::text, 4, '0')
FROM ranked
WHERE c.id = ranked.id
  AND (c.customer_code IS NULL OR c.customer_code !~ '^CUS-[0-9]+$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_company_code
  ON customers (company_id, customer_code);

ALTER TABLE rental_contracts
  ADD COLUMN IF NOT EXISTS return_condition VARCHAR(64);
